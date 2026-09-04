import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const RAIZ = process.cwd();
const NOMBRES_SENSIBLES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_ACCESS_TOKEN",
  "CLOUDFLARE_API_TOKEN",
  "KEEPALIVE_SECRET",
];

function ejecutarGit(argumentos, codificacion = "utf8") {
  return execFileSync("git", argumentos, {
    cwd: RAIZ,
    encoding: codificacion,
    maxBuffer: 256 * 1024 * 1024,
    windowsHide: true,
  });
}

function obtenerSecretosLocales() {
  const ruta = resolve(RAIZ, ".env.local");
  if (!existsSync(ruta)) return [];

  const variables = new Map();
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const coincidencia = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!coincidencia) continue;
    const valor = coincidencia[2].replace(/^['"]|['"]$/g, "").trim();
    variables.set(coincidencia[1], valor);
  }

  return NOMBRES_SENSIBLES.map((nombre) => variables.get(nombre) ?? "").filter(
    (valor) => valor.length >= 16,
  );
}

function esBinario(contenido) {
  return contenido.subarray(0, 8_192).includes(0);
}

const rutas = ejecutarGit(["ls-files", "-z"], "buffer")
  .toString("utf8")
  .split("\0")
  .filter(Boolean);
const secretosLocales = obtenerSecretosLocales();
const hallazgos = [];

for (const ruta of rutas) {
  const contenido = readFileSync(resolve(RAIZ, ruta));
  if (esBinario(contenido)) continue;

  const texto = contenido.toString("utf8");
  if (secretosLocales.some((secreto) => texto.includes(secreto))) {
    hallazgos.push("valor local sensible presente en un archivo versionado");
  }
  if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(texto)) {
    hallazgos.push("clave secreta Supabase presente en un archivo versionado");
  }
  if (/eyJhbGciOiJIUzI1Ni[A-Za-z0-9_-]{40,}/.test(texto)) {
    hallazgos.push("JWT incrustado en un archivo versionado");
  }
}

const historial = ejecutarGit(["log", "-p", "--all", "--no-ext-diff"]);
if (secretosLocales.some((secreto) => historial.includes(secreto))) {
  hallazgos.push("valor local sensible presente en el historial Git");
}
if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(historial)) {
  hallazgos.push("clave secreta Supabase presente en el historial Git");
}
if (/eyJhbGciOiJIUzI1Ni[A-Za-z0-9_-]{40,}/.test(historial)) {
  hallazgos.push("JWT incrustado en el historial Git");
}

const unicos = [...new Set(hallazgos)];
if (unicos.length > 0) {
  console.error("Auditoría de secretos rechazada:");
  for (const hallazgo of unicos) console.error(`- ${hallazgo}`);
  console.error("Los valores detectados se omitieron deliberadamente.");
  process.exit(1);
}

console.log(
  `Auditoría de secretos aprobada: ${rutas.length} archivos y el historial Git no contienen credenciales privadas detectables.`,
);
