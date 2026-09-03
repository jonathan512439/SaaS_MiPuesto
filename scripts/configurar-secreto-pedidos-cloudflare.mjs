import { spawn } from "node:child_process";

import { obtenerClaveServicioLocal } from "./servicio-supabase-local.mjs";

const NOMBRE_SECRETO = "SUPABASE_SERVICE_ROLE_KEY";
const clave = await obtenerClaveServicioLocal();
const comando = process.platform === "win32" ? "npx.cmd" : "npx";

const proceso = spawn(
  comando,
  ["wrangler", "secret", "put", NOMBRE_SECRETO, "--config", "wrangler.jsonc"],
  {
    shell: process.platform === "win32",
    stdio: ["pipe", "inherit", "inherit"],
  },
);

proceso.stdin.end(`${clave}\n`);

const codigo = await new Promise((resolve, reject) => {
  proceso.once("error", reject);
  proceso.once("close", resolve);
});

if (codigo !== 0) {
  throw new Error(`Wrangler termino con codigo ${codigo}.`);
}

console.log(
  `Secreto ${NOMBRE_SECRETO} configurado sin mostrarlo ni guardarlo en el repositorio.`,
);
