/* Revisa los archivos de Storage: referencias rotas y archivos sin uso.
 *
 *   npm run archivos:revisar             # producción, con la sesión del CLI
 *   npm run archivos:revisar -- --ensayo # la base de ensayo
 *
 * Cada semana lo corre `.github/workflows/revisar-archivos.yml`, con
 * `REVISAR_DB_URL`. La lógica vive en la base —`revisar_archivos_storage()`,
 * probada con `npm run test:archivos:ensayo`— y acá solo se cuenta.
 *
 * **Solo lee. No borra nada.** Un archivo sin uso ocupa espacio y nadie lo ve:
 * se borra a mano, después de mirarlo. Una referencia rota sí la ve un cliente
 * —un hueco donde iba la foto—, y por eso es lo único que hace fallar la
 * revisión: en GitHub, un trabajo que falla le escribe al dueño del
 * repositorio.
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CLI = join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js");
const MOSTRAR_SIN_USO = 30;

function destino() {
  if (process.env.REVISAR_DB_URL) return { nombre: "la base indicada", argumentos: ["--db-url", process.env.REVISAR_DB_URL] };
  if (process.argv.includes("--ensayo")) {
    if (!process.env.ENSAYO_DB_URL) throw new Error("Falta ENSAYO_DB_URL en .env.local.");
    return { nombre: "ensayo", argumentos: ["--db-url", process.env.ENSAYO_DB_URL] };
  }
  return { nombre: "producción", argumentos: ["--linked"] };
}

/* El archivo temporal y no la consulta como argumento: así no depende de cómo
   el sistema parte los argumentos. */
function consultar(argumentos) {
  const carpeta = mkdtempSync(join(resolve(tmpdir()), "mipuesto-archivos-"));
  const archivo = join(carpeta, "revisar.sql");
  try {
    writeFileSync(archivo, "select * from public.revisar_archivos_storage();\n", "utf8");
    const salida = spawnSync(
      process.execPath,
      [CLI, "db", "query", ...argumentos, "--file", archivo, "-o", "json"],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    if (salida.status !== 0) {
      throw new Error(`La consulta falló:\n${salida.stderr.replaceAll(/postgres(ql)?:\/\/\S+/g, "postgresql://…")}`);
    }
    const inicio = salida.stdout.indexOf("{");
    return JSON.parse(salida.stdout.slice(inicio)).rows ?? [];
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
}

const { nombre, argumentos } = destino();
const filas = consultar(argumentos);
const rotas = filas.filter((fila) => fila.tipo === "rota");
const sinUso = filas.filter((fila) => fila.tipo === "sin_uso");

const lineas = [
  `## Revisión de archivos — ${nombre}`,
  "",
  `- Referencias rotas (un cliente ve un hueco): **${rotas.length}**`,
  `- Archivos sin uso (ocupan espacio, nadie los ve): **${sinUso.length}**`,
];
if (rotas.length > 0) {
  lineas.push("", "### Rotas", "", ...rotas.map((fila) => `- \`${fila.negocio}\` · ${fila.bucket}/${fila.ruta}`));
}
if (sinUso.length > 0) {
  lineas.push(
    "",
    `### Sin uso${sinUso.length > MOSTRAR_SIN_USO ? ` (las primeras ${MOSTRAR_SIN_USO})` : ""}`,
    "",
    ...sinUso.slice(0, MOSTRAR_SIN_USO).map((fila) => `- \`${fila.negocio}\` · ${fila.bucket}/${fila.ruta}`),
  );
}
const informe = lineas.join("\n");

console.log(informe);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${informe}\n`);

if (rotas.length > 0) {
  console.error(`\n${rotas.length} referencia(s) rota(s): hay productos o negocios mostrando un hueco.`);
  process.exit(1);
}
