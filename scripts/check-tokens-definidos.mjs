/* Ningún `var(--token)` puede apuntar a un token que no existe.
 *
 * Es una falla silenciosa y por eso hace falta una guarda. `color:
 * var(--color-texto-tenue)` con ese token sin definir **no es un error de CSS**:
 * la declaración queda inválida al calcular el valor y, para una propiedad
 * heredada como `color`, eso significa que el elemento hereda el color del padre.
 * O sea, el texto se ve — con otro color que el que alguien eligió— y nadie se
 * entera. No lo atrapa el compilador, ni el lint, ni la guarda de tokens, que
 * mira que no se escriban valores a mano pero no que el nombre exista.
 *
 * Pasó con `--color-texto-tenue` y `--color-fondo-hundido`: cuatro hojas del
 * panel los usaban y ninguno de los dos estaba definido en ningún lado.
 *
 * Se juntan las definiciones de **todas** las hojas, no solo de `globals.css`:
 * un módulo puede definir los suyos, como hace el tema del catálogo con los
 * `--catalogo-*`. Lo que se persigue es el nombre que no existe en ninguna parte.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));

function listarCss(ruta) {
  return readdirSync(ruta).flatMap((nombre) => {
    const completa = join(ruta, nombre);
    if (statSync(completa).isDirectory()) return listarCss(completa);
    return extname(completa) === ".css" ? [completa] : [];
  });
}

const hojas = ["app", "components"].flatMap((carpeta) => listarCss(join(raiz, carpeta)));

const definidos = new Set();
for (const hoja of hojas) {
  for (const [, nombre] of readFileSync(hoja, "utf8").matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) {
    definidos.add(nombre);
  }
}

/* Las fuentes las declara `next/font` en `app/layout.tsx` y las inyecta como
   variable en el elemento raíz: existen, pero no en ninguna hoja. Se leen de ahí
   en vez de escribirlas a mano acá, para que agregar una fuente no obligue a
   acordarse de esta lista. */
for (const [, nombre] of readFileSync(join(raiz, "app", "layout.tsx"), "utf8").matchAll(
  /variable:\s*"(--[a-zA-Z0-9-]+)"/g,
)) {
  definidos.add(nombre);
}

/* Los que pone el empaquetador, no la hoja. */
const PREFIJOS_EXTERNOS = ["--tw-"];

const errores = [];
for (const hoja of hojas) {
  const contenido = readFileSync(hoja, "utf8");
  for (const coincidencia of contenido.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) {
    const nombre = coincidencia[1];
    if (definidos.has(nombre)) continue;
    if (PREFIJOS_EXTERNOS.some((prefijo) => nombre.startsWith(prefijo))) continue;
    const linea = contenido.slice(0, coincidencia.index).split("\n").length;
    errores.push(`${relative(raiz, hoja).replaceAll("\\", "/")}:${linea}: ${nombre}`);
  }
}

if (errores.length > 0) {
  const unicos = [...new Set(errores)];
  throw new Error(
    `Se usan tokens que no están definidos en ninguna hoja:\n${unicos
      .map((error) => `- ${error}`)
      .join("\n")}`,
  );
}

console.log(`Control de tokens definidos: correcto. ${definidos.size} tokens, todos existen.`);
