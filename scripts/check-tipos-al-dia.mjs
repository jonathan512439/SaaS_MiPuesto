/* Los tipos de la base, al día con las migraciones.
 *
 * `lib/supabase/database.types.ts` se genera desde la base con
 * `npm run types:db:linked`, y generarlo desde las migraciones exige Docker,
 * que no hay. Así que se regenera a mano después de cada migración, y un
 * olvido deja a TypeScript mirando un esquema viejo: una columna nueva no
 * existe para el código, o se lee con `as` y deja de protegerse.
 *
 * Esta guardia no puede regenerar —no tiene la base—, pero sí comprobar lo que
 * más se olvida: **cada tabla y cada columna que una migración crea tiene que
 * aparecer en los tipos**, salvo las que otra migración posterior borró.
 *
 * Es por texto y lo sabe: no entiende SQL, busca `create table public.x`,
 * `add column y`, `drop table` y `drop column`. Alcanza para atrapar el olvido,
 * que es lo que pasa. Se corre con `npm test`.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const carpeta = join(raiz, "supabase", "migrations");
const tipos = readFileSync(join(raiz, "lib", "supabase", "database.types.ts"), "utf8");

const tablas = new Set();
const columnas = new Set();

for (const archivo of readdirSync(carpeta).sort()) {
  const sql = readFileSync(join(carpeta, archivo), "utf8").replace(/--.*$/gm, "");
  for (const [, tabla] of sql.matchAll(/create table (?:if not exists )?public\.([a-z_][a-z0-9_]*)/gi)) {
    tablas.add(tabla);
  }
  for (const [, columna] of sql.matchAll(/add column (?:if not exists )?([a-z_][a-z0-9_]*)/gi)) {
    columnas.add(columna);
  }
  /* Lo que una migración posterior borró deja de exigirse. */
  for (const [, tabla] of sql.matchAll(/drop table (?:if exists )?public\.([a-z_][a-z0-9_]*)/gi)) {
    tablas.delete(tabla);
  }
  for (const [, columna] of sql.matchAll(/drop column (?:if exists )?([a-z_][a-z0-9_]*)/gi)) {
    columnas.delete(columna);
  }
}

const faltan = [
  ...[...tablas].filter((tabla) => !new RegExp(`^\\s+${tabla}: \\{`, "m").test(tipos)).map((t) => `tabla ${t}`),
  ...[...columnas].filter((columna) => !new RegExp(`\\b${columna}\\??:`).test(tipos)).map((c) => `columna ${c}`),
];

if (faltan.length > 0) {
  console.error("Los tipos de la base están atrasados respecto de las migraciones:");
  for (const falta of faltan) console.error(`- ${falta}`);
  console.error("\nCorre `npm run types:db:linked` después de aplicar la migración.");
  process.exit(1);
}

console.log(`Tipos de la base: al día (${tablas.size} tablas y ${columnas.size} columnas agregadas por migraciones).`);
