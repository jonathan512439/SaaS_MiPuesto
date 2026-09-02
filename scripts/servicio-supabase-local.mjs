import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";

const ejecutarArchivo = promisify(execFile);

function obtenerProyectoRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;

  try {
    return readFileSync("supabase/.temp/project-ref", "utf8").trim();
  } catch {
    throw new Error(
      "No se encontró el proyecto enlazado. Ejecutá npx supabase link antes de usar esta operación.",
    );
  }
}

export async function obtenerClaveServicioLocal() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  const comando = process.platform === "win32" ? "npx.cmd" : "npx";
  const { stdout } = await ejecutarArchivo(
    comando,
    [
      "supabase",
      "projects",
      "api-keys",
      "--project-ref",
      obtenerProyectoRef(),
      "--reveal",
      "--output",
      "json",
    ],
    { shell: process.platform === "win32" },
  );
  const claves = JSON.parse(stdout);
  const clave = claves.find((item) => item.name === "service_role")?.api_key;

  if (!clave) {
    throw new Error("No se pudo obtener la clave service_role del proyecto enlazado.");
  }

  return clave;
}
