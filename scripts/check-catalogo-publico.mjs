/* El catálogo público no puede usar lo que solo existe en el panel.
 *
 * `useAvisos` y `useConfirmacion` **lanzan** si no encuentran su proveedor, y sus
 * proveedores viven en los `layout` del panel y de la plataforma. Un componente
 * del catálogo que los use rompe la ficha entera con el mensaje de recargar, y
 * el error solo aparece al hacer clic: ni el build ni las pruebas lo ven.
 *
 * Pasó de verdad con el selector de turnos de la fase 5.
 *
 * La comprobación **recorre los import de verdad** desde las páginas públicas en
 * vez de tener escrita una lista de archivos prohibidos. Una lista a mano se
 * queda vieja en cuanto alguien agrega un componente, y el error vuelve.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));

/* Por dónde entra el visitante. Si mañana hay otra página pública, se suma acá:
   es la única lista escrita a mano, y es la de las puertas, no la del interior. */
const ENTRADAS = [
  "app/(public)/[slug]/page.tsx",
  "app/(public)/[slug]/imprimir/page.tsx",
];

const PROHIBIDOS = ["useAvisos", "useConfirmacion"];

const EXTENSIONES = [".tsx", ".ts", "/index.tsx", "/index.ts"];

function resolverImport(desde, especificador) {
  if (!especificador.startsWith(".")) return null;
  const base = resolve(dirname(desde), especificador);
  for (const extension of EXTENSIONES) {
    const candidato = `${base}${extension}`;
    if (existsSync(candidato)) return candidato;
  }
  return existsSync(base) ? base : null;
}

const visitados = new Set();
const problemas = [];

function recorrer(archivo, camino) {
  if (visitados.has(archivo)) return;
  visitados.add(archivo);

  const contenido = readFileSync(archivo, "utf8");
  const relativo = archivo.slice(raiz.length).replace(/\\/g, "/");

  for (const prohibido of PROHIBIDOS) {
    /* Se busca **la llamada**, no el import ni la declaración. El archivo que
       define el hook lo nombra igual —`export function useAvisos()`— y marcarlo
       sería acusar justamente al que lo provee. Por eso se descarta lo que viene
       precedido de `function`. */
    if (new RegExp(`(?<!function\\s)\\b${prohibido}\\s*\\(`).test(contenido)) {
      problemas.push(
        `${relativo} usa ${prohibido}(), que lanza sin su proveedor.\n` +
          `    Llega desde: ${camino.join(" → ")}\n` +
          `    El catálogo público no tiene ProveedorAvisos ni ProveedorConfirmacion.`,
      );
    }
  }

  for (const [, especificador] of contenido.matchAll(/from\s+"([^"]+)"/g)) {
    const siguiente = resolverImport(archivo, especificador);
    if (siguiente) recorrer(siguiente, [...camino, relativo]);
  }
}

for (const entrada of ENTRADAS) {
  const archivo = join(raiz, entrada);
  if (!existsSync(archivo)) {
    console.error(`No existe la página pública ${entrada}. Corregí la lista del script.`);
    process.exit(1);
  }
  recorrer(archivo, []);
}

if (problemas.length > 0) {
  console.error("Control del catálogo público fallido:");
  for (const problema of problemas) console.error(`- ${problema}`);
  process.exit(1);
}

console.log(
  `Control del catálogo público: correcto. ${visitados.size} archivos alcanzables, ninguno usa lo del panel.`,
);
