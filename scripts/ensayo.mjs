/* Opera la base de ensayo, y solo la base de ensayo.
 *
 *   npm run ensayo:push        aplica todas las migraciones en limpio
 *   npm run ensayo:estructura  corre la auditoría de estructura
 *   npm run ensayo:rls         corre el recorrido de aislamiento
 *   npm run ensayo:ver         dice a qué proyecto está apuntando
 *
 * Existe porque el plan v3 aplica más de veinte migraciones sobre datos reales y
 * varias traen una incógnita que hay que resolver antes: si una función sirve
 * dentro de una columna generada, si una restricción de exclusión se puede crear
 * sin bloquear, si dos pedidos simultáneos se serializan. Eso se averigua en una
 * base que se puede romper.
 *
 * **El seguro es la razón por la que esto es un script y no un comando suelto.**
 * `supabase db push --db-url <algo>` aplica migraciones a donde le digas, y una
 * variable mal pegada apuntaría a producción sin preguntar. Acá se compara contra
 * el proyecto enlazado y contra la URL pública antes de hacer nada: si coinciden,
 * el proceso termina sin tocar la base.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CLI = join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js");

function refDelProyectoReal() {
  /* Dos fuentes, porque cualquiera de las dos puede faltar y con una alcanza
     para negarse. La del archivo es la que usa el CLI; la de la URL es la que
     usa la aplicación. */
  const refs = new Set();

  try {
    refs.add(readFileSync("supabase/.temp/project-ref", "utf8").trim());
  } catch {
    /* Sin enlazar todavía: no es un error acá. */
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    const coincidencia = /https:\/\/([a-z0-9]+)\.supabase\.(co|in)/i.exec(url);
    if (coincidencia) refs.add(coincidencia[1]);
  }

  return [...refs].filter(Boolean);
}

function urlDeEnsayo() {
  const url = process.env.ENSAYO_DB_URL;
  if (!url) {
    throw new Error(
      "Falta ENSAYO_DB_URL en .env.local.\n" +
        "Es la cadena de conexión del proyecto de ensayo, en modo session,\n" +
        "desde Supabase → Project Settings → Database.",
    );
  }

  const prohibidos = refDelProyectoReal();
  const apuntaAlReal = prohibidos.find((ref) => url.includes(ref));
  if (apuntaAlReal) {
    throw new Error(
      `ENSAYO_DB_URL apunta al proyecto REAL (${apuntaAlReal}). No se hace nada.\n` +
        "La base de ensayo tiene que ser un proyecto de Supabase distinto.",
    );
  }

  return url;
}

function correr(comando, argumentos, entorno = {}) {
  return new Promise((resolver, rechazar) => {
    const proceso = spawn(comando, argumentos, {
      stdio: "inherit",
      env: { ...process.env, ...entorno },
    });
    proceso.on("error", rechazar);
    proceso.on("exit", (codigo) =>
      codigo === 0 ? resolver() : rechazar(new Error(`Terminó con código ${codigo}.`)),
    );
  });
}

const accion = process.argv[2];

if (accion === "ver") {
  const url = urlDeEnsayo();
  /* Se muestra el anfitrión y nunca la contraseña: la cadena de conexión trae
     la clave de la base adentro. */
  console.log(`Base de ensayo: ${new URL(url).host}`);
  console.log(`Proyectos protegidos: ${refDelProyectoReal().join(", ") || "ninguno detectado"}`);
} else if (accion === "push") {
  await correr(process.execPath, [CLI, "db", "push", "--db-url", urlDeEnsayo()]);
} else if (accion === "estructura") {
  const archivo = process.argv[3] ?? "supabase/tests/remote/fase2-audit.sql";
  await correr(process.execPath, [CLI, "db", "query", "--db-url", urlDeEnsayo(), "--file", archivo]);
} else if (accion === "rls") {
  /* El recorrido de aislamiento habla por la API de datos, no por SQL, así que
     necesita las claves del proyecto de ensayo. Se le pasan con los nombres que
     ya espera, en vez de cambiar el script probado. */
  urlDeEnsayo();
  const url = process.env.ENSAYO_URL;
  const publica = process.env.ENSAYO_PUBLISHABLE_KEY;
  const servicio = process.env.ENSAYO_SERVICE_ROLE_KEY;

  if (!url || !publica || !servicio) {
    throw new Error(
      "Faltan ENSAYO_URL, ENSAYO_PUBLISHABLE_KEY y ENSAYO_SERVICE_ROLE_KEY en .env.local.",
    );
  }

  await correr(process.execPath, ["scripts/test-rls-multitenant.mjs"], {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publica,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    SUPABASE_SERVICE_ROLE_KEY: servicio,
  });
} else {
  console.error("Uso: node scripts/ensayo.mjs <ver|push|estructura|rls>");
  process.exit(1);
}
