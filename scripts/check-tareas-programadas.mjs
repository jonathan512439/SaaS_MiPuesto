/* Las tareas programadas viven en tres sitios y tienen que decir lo mismo.
 *
 *   1. La migración que las programa      → es lo que corre en producción
 *   2. `public.estado_tareas()`           → es lo que las vigila
 *   3. `supabase/restauracion/02-postambulo.sql` → es lo que las recrea al restaurar
 *
 * Una tarea que está en 1 y falta en 2 es un vigilante que nadie vigila: ya pasó
 * en este proyecto y hubo que corregirlo con una migración aparte. Una que está
 * en 1 y falta en 3 es peor y más silenciosa: la base restaurada queda con todos
 * los datos y sin nada que corra sola, y se ve bien hasta que alguien pregunta
 * por qué una reserva de anteayer sigue tomada.
 *
 * Se corre con `npm test`.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRACIONES = "supabase/migrations";
const POSTAMBULO = "supabase/restauracion/02-postambulo.sql";

function nombresEn(texto, expresion) {
  return new Set([...texto.matchAll(expresion)].map(([, nombre]) => nombre));
}

/* Lo que las migraciones programan. Se recorren todas y en orden: una migración
   posterior puede desprogramar una tarea, y en ese caso `cron.unschedule` con el
   nombre literal la saca de la cuenta. */
const programadas = new Set();
for (const archivo of readdirSync(MIGRACIONES).sort()) {
  const sql = readFileSync(join(MIGRACIONES, archivo), "utf8");
  for (const nombre of nombresEn(sql, /cron\.schedule\(\s*'([a-z0-9-]+)'/g)) {
    programadas.add(nombre);
  }
  for (const nombre of nombresEn(sql, /cron\.unschedule\(\s*'([a-z0-9-]+)'\s*\)/g)) {
    programadas.delete(nombre);
  }
}

/* Lo que vigila `estado_tareas()`: la lista de valores de su cláusula `values`.
   Se toma de la definición más reciente, que es la que quedó viva. */
let vigiladas = new Set();
for (const archivo of readdirSync(MIGRACIONES).sort()) {
  const sql = readFileSync(join(MIGRACIONES, archivo), "utf8");
  if (!/create or replace function public\.estado_tareas/.test(sql)) continue;
  vigiladas = nombresEn(sql, /\('(mipuesto-[a-z0-9-]+)',\s*\d+\)/g);
}

const recreadas = nombresEn(readFileSync(POSTAMBULO, "utf8"), /\('(mipuesto-[a-z0-9-]+)',/g);

const problemas = [];

function comparar(esperado, obtenido, dondeFalta, dondeSobra) {
  for (const nombre of esperado) {
    if (!obtenido.has(nombre)) problemas.push(`«${nombre}» se programa pero ${dondeFalta}.`);
  }
  for (const nombre of obtenido) {
    if (!esperado.has(nombre)) problemas.push(`«${nombre}» ${dondeSobra} y no se programa en ninguna migración.`);
  }
}

if (programadas.size === 0) {
  problemas.push("No se encontró ninguna tarea programada en las migraciones. ¿Cambió la forma de `cron.schedule`?");
}

comparar(programadas, vigiladas, "no está en estado_tareas(): sería un vigilante que nadie vigila", "está en estado_tareas()");
comparar(programadas, recreadas, `no está en ${POSTAMBULO}: la base restaurada la perdería en silencio`, "está en el postámbulo");

if (problemas.length > 0) {
  console.error("Control de tareas programadas: DESINCRONIZADO");
  for (const problema of problemas) console.error(`  - ${problema}`);
  process.exit(1);
}

console.log(`Control de tareas programadas: correcto. ${programadas.size} tareas, programadas, vigiladas y recreables.`);
