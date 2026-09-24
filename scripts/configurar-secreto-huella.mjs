/* El secreto con que se firman las IP (`HUELLA_IP_SECRETO`), propio y al azar.
 *
 * Genera 32 bytes aleatorios, los carga como secreto del Worker y los agrega a
 * `.env.local` para el desarrollo, **sin mostrarlos nunca**: van por la entrada
 * de wrangler, no por la línea de comandos ni por la pantalla.
 *
 *   npm run cloudflare:secret:huella            # solo si falta en .env.local
 *   npm run cloudflare:secret:huella -- --rotar # uno nuevo en los dos lados
 *
 * Rotarlo no rompe nada: las firmas cambian y los topes por IP arrancan de
 * cero, que es lo que se quiere si el secreto se filtró.
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const NOMBRE = "HUELLA_IP_SECRETO";
const ARCHIVO_LOCAL = ".env.local";
const rotar = process.argv.includes("--rotar");

const local = existsSync(ARCHIVO_LOCAL) ? readFileSync(ARCHIVO_LOCAL, "utf8") : "";
const lineaExistente = local.split(/\r?\n/).find((linea) => linea.startsWith(`${NOMBRE}=`));

/* Sin --rotar, el de .env.local manda: así el Worker y el desarrollo firman
   igual. Con --rotar, o si no hay ninguno, se genera uno nuevo. */
const secreto =
  !rotar && lineaExistente && lineaExistente.length > NOMBRE.length + 32
    ? lineaExistente.slice(NOMBRE.length + 1).trim()
    : randomBytes(32).toString("hex");

const comando = process.platform === "win32" ? "npx.cmd" : "npx";
const proceso = spawn(comando, ["wrangler", "secret", "put", NOMBRE, "--config", "wrangler.jsonc"], {
  shell: process.platform === "win32",
  stdio: ["pipe", "inherit", "inherit"],
});
proceso.stdin.end(`${secreto}\n`);

const codigo = await new Promise((resolve, reject) => {
  proceso.once("error", reject);
  proceso.once("close", resolve);
});
if (codigo !== 0) throw new Error(`Wrangler terminó con código ${codigo}.`);

const sinLaVieja = local
  .split(/\r?\n/)
  .filter((linea) => !linea.startsWith(`${NOMBRE}=`))
  .join("\n")
  .replace(/\n*$/, "\n");
writeFileSync(ARCHIVO_LOCAL, `${sinLaVieja}${NOMBRE}=${secreto}\n`);

console.log(`Secreto ${NOMBRE} configurado en Cloudflare y en ${ARCHIVO_LOCAL}, sin mostrarlo.`);
