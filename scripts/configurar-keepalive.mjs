import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";

const REPOSITORIO = "jonathan512439/SaaS_MiPuesto";
const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const proyecto = urlSupabase.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/)?.[1];

if (!proyecto) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL no identifica un proyecto válido.");
}

function ejecutar(programa, argumentos, entrada = "") {
  return new Promise((resolver, rechazar) => {
    const proceso = spawn(programa, argumentos, {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
      stdio: ["pipe", "inherit", "inherit"],
    });

    proceso.on("error", rechazar);
    proceso.on("exit", (codigo) => {
      if (codigo === 0) resolver();
      else rechazar(new Error(`${programa} terminó con código ${codigo}.`));
    });
    proceso.stdin.end(entrada);
  });
}

const secreto = randomBytes(32).toString("base64url");
const raizTemporal = resolve(tmpdir());
const directorioTemporal = await mkdtemp(join(raizTemporal, "mipuesto-keepalive-"));
const archivoTemporal = join(directorioTemporal, "secreto.env");

try {
  await writeFile(archivoTemporal, `KEEPALIVE_SECRET=${secreto}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });

  const supabaseCli = join(
    process.cwd(),
    "node_modules",
    "supabase",
    "dist",
    "supabase.js",
  );
  await ejecutar(process.execPath, [supabaseCli,
    "secrets",
    "set",
    "--env-file",
    archivoTemporal,
    "--project-ref",
    proyecto,
  ]);
  await ejecutar(
    "gh",
    ["secret", "set", "SUPABASE_KEEPALIVE_SECRET", "--repo", REPOSITORIO],
    `${secreto}\n`,
  );

  console.log(
    "KEEPALIVE_SECRET configurado en Supabase y GitHub sin mostrarlo ni guardarlo en el repositorio.",
  );
} finally {
  const rutaRelativa = relative(raizTemporal, resolve(directorioTemporal));
  if (
    !rutaRelativa ||
    rutaRelativa.startsWith("..") ||
    isAbsolute(rutaRelativa) ||
    !rutaRelativa.startsWith("mipuesto-keepalive-")
  ) {
    throw new Error("No se pudo validar el directorio temporal para borrarlo.");
  }
  await rm(directorioTemporal, { recursive: true, force: true });
}
