import { spawn } from "node:child_process";

/* Sube la clave de Gemini como secreto del Worker sin mostrarla en pantalla ni
   dejarla en un archivo del repositorio. Se lee de `.env.local`, que el script
   recibe ya cargado por `--env-file-if-exists`.

   Es el mismo trato que la clave privilegiada de Supabase: en producción no
   viaja como variable del build, va como secreto. */
const NOMBRE_SECRETO = "GEMINI_API_KEY";
const clave = (process.env[NOMBRE_SECRETO] ?? "").trim();

if (clave.length < 20) {
  throw new Error(
    `Falta ${NOMBRE_SECRETO} en .env.local. Pegá la clave de Google AI Studio y volvé a intentar.`,
  );
}

const comando = process.platform === "win32" ? "npx.cmd" : "npx";
const proceso = spawn(
  comando,
  ["wrangler", "secret", "put", NOMBRE_SECRETO, "--config", "wrangler.jsonc"],
  { shell: process.platform === "win32", stdio: ["pipe", "inherit", "inherit"] },
);

proceso.stdin.end(`${clave}\n`);

const codigo = await new Promise((resolve, reject) => {
  proceso.once("error", reject);
  proceso.once("close", resolve);
});

if (codigo !== 0) throw new Error(`Wrangler terminó con código ${codigo}.`);

console.log(
  `Secreto ${NOMBRE_SECRETO} configurado sin mostrarlo ni guardarlo en el repositorio.`,
);
