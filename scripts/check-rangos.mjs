/* Las columnas de rango no se filtran con comparadores de valor.
 *
 * `citas.rango` es un `tstzrange`. Compararlo con `.gte("rango", fecha)` hace que
 * Postgres rechace la consulta con «malformed range literal», y si el error se
 * ignora la pantalla muestra una lista vacía sin ningún aviso. Pasó dos veces el
 * mismo día: la Agenda del dueño no mostraba las reservas pendientes, y el
 * borrado de un recurso no veía sus turnos por delante.
 *
 * Los operadores correctos son los de rango: `rangeGte`, `rangeLte`, `overlaps`,
 * `containedBy`, `rangeAdjacent`.
 *
 * Es una comprobación por texto y lo sabe: no entiende tipos, solo busca la
 * columna `rango` con un comparador de valor. Alcanza, porque en este proyecto
 * hay una sola columna de rango y siempre se llama así.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const CARPETAS = ["app", "components", "lib", "scripts"];
const PROHIBIDO = /\.(gte|lte|gt|lt|eq|neq)\(\s*["']rango["']/g;

function archivos(carpeta) {
  const salida = [];
  for (const nombre of readdirSync(carpeta)) {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) {
      if (nombre === "node_modules") continue;
      salida.push(...archivos(ruta));
    } else if (/\.(ts|tsx|mjs)$/.test(nombre)) {
      salida.push(ruta);
    }
  }
  return salida;
}

const problemas = [];
for (const carpeta of CARPETAS) {
  for (const archivo of archivos(join(raiz, carpeta))) {
    /* Este archivo nombra el patrón prohibido en su propio comentario, para
       explicarlo. Se salta a sí mismo: acusarse sería fallar por documentarse. */
    if (archivo.endsWith("check-rangos.mjs")) continue;
    const contenido = readFileSync(archivo, "utf8");
    for (const coincidencia of contenido.matchAll(PROHIBIDO)) {
      const linea = contenido.slice(0, coincidencia.index).split("\n").length;
      problemas.push(
        `${archivo.slice(raiz.length).split("\\").join("/")}:${linea} usa ${coincidencia[0]}…) sobre una columna de rango.`,
      );
    }
  }
}

if (problemas.length > 0) {
  console.error("Control de rangos fallido: `rango` es un tstzrange y no se compara con valores.");
  for (const problema of problemas) console.error(`- ${problema}`);
  console.error("Usá rangeGte, rangeLte, overlaps o containedBy.");
  process.exit(1);
}
console.log("Control de rangos: correcto.");
