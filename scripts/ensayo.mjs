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

/* El identificador del proyecto que trae una cadena del pooler: el `<ref>` de
   `postgres.<ref>`. Es lo que permite comparar dos cadenas sin mirar la
   contraseña que llevan adentro. */
function refDeCadena(cadena) {
  return /postgres\.([a-z0-9]{16,})/i.exec(cadena)?.[1] ?? null;
}

/* Qué es una clave de Supabase, sin mostrarla.
 *
 * «Invalid API key» es opaco a propósito y tapa tres errores distintos: la
 * clave está mal copiada, es del proyecto equivocado, o están cruzadas entre sí.
 * Los tres se distinguen desde afuera, porque las claves lo dicen: las viejas
 * son JWT y llevan el rol y el proyecto en su carga, y las nuevas lo llevan en
 * el prefijo. **Nada de esto imprime la clave**, solo lo que declara ser.
 */
function describirClave(valor) {
  const limpio = valor.trim();
  const sobra = limpio !== valor;

  if (limpio.startsWith("sb_publishable_")) return { rol: "anon", ref: null, sobra };
  if (limpio.startsWith("sb_secret_")) return { rol: "service_role", ref: null, sobra };

  if (limpio.startsWith("eyJ")) {
    try {
      const carga = JSON.parse(Buffer.from(limpio.split(".")[1], "base64url").toString());
      return { rol: carga.role ?? "desconocido", ref: carga.ref ?? null, sobra };
    } catch {
      return { rol: "ilegible", ref: null, sobra };
    }
  }

  return { rol: "no parece una clave de Supabase", ref: null, sobra };
}

function comprobarClave(nombre, valor, rolEsperado, refEsperado) {
  const { rol, ref, sobra } = describirClave(valor);

  if (sobra) {
    fallar(
      `${nombre} tiene espacios o un salto de línea alrededor.\n` +
        "Eso solo da «Invalid API key». Pegala en una sola línea, sin comillas.",
    );
  }
  if (rol !== rolEsperado) {
    fallar(
      `${nombre} no es la clave que corresponde.\n` +
        `  Se esperaba una clave de rol «${rolEsperado}» y esta declara «${rol}».\n\n` +
        (rol === "anon" || rol === "service_role"
          ? "Parece que están cruzadas: revisá cuál va en cada variable."
          : "Sale de Supabase → mipuesto-ensayo → Project Settings → API."),
    );
  }
  if (ref && refEsperado && ref !== refEsperado) {
    fallar(
      `${nombre} es de otro proyecto.\n` +
        `  La clave declara pertenecer a: ${ref}\n` +
        `  La base de ensayo es:          ${refEsperado}\n\n` +
        "Es una clave válida, del proyecto equivocado: por eso el error decía\n" +
        "«Invalid API key» y no «clave incorrecta».",
    );
  }
}

function fallar(mensaje) {
  /* Sin volcado de pila: quien lee esto tiene que arreglar una variable, no
     depurar este archivo. La primera versión dejaba que `new URL` reventara con
     un ERR_INVALID_URL y veinte líneas de Node, que no dicen qué hacer. */
  console.error(`\n${mensaje}\n`);
  process.exit(1);
}

function urlDeEnsayo() {
  const url = process.env.ENSAYO_DB_URL;
  if (!url) {
    fallar(
      "Falta ENSAYO_DB_URL en .env.local.\n" +
        "Es la cadena de conexión del proyecto de ensayo, en modo session pooler,\n" +
        "desde Supabase → Project Settings → Database → Connection string.",
    );
  }

  /* Que sea una cadena de conexión y no cualquier cosa. Un identificador suelto
     pasaba las dos comprobaciones de abajo —no está vacío y no contiene el ref
     del proyecto real— y llegaba entero hasta el CLI. */
  let analizada;
  try {
    analizada = new URL(url);
  } catch {
    analizada = null;
  }
  if (!analizada || !/^postgresql?:$/.test(analizada.protocol)) {
    fallar(
      `ENSAYO_DB_URL no es una cadena de conexión: «${url.slice(0, 24)}…»\n\n` +
        "Tiene que empezar con postgresql:// y verse así:\n" +
        "  postgresql://postgres.<ref>:<contraseña>@aws-0-...pooler.supabase.com:5432/postgres\n\n" +
        "Sale de Supabase → mipuesto-ensayo → Project Settings → Database →\n" +
        "Connection string, pestaña «Session pooler», reemplazando [YOUR-PASSWORD].",
    );
  }

  const refEnsayo = refDeCadena(url);
  if (!refEnsayo) {
    fallar(
      "No se puede identificar el proyecto en ENSAYO_DB_URL.\n" +
        "Hace falta la cadena del pooler, que lleva el usuario postgres.<ref>.\n" +
        "Sin poder identificarlo no hay forma de comprobar que no sea producción,\n" +
        "y ante la duda esto no hace nada.",
    );
  }

  const apuntaAlReal = refDelProyectoReal().find((ref) => ref === refEnsayo);
  if (apuntaAlReal) {
    fallar(
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
  /* Se muestra el anfitrión y el identificador, nunca la contraseña: la cadena
     de conexión la lleva adentro. */
  console.log(`Base de ensayo: ${new URL(url).host}`);
  console.log(`Proyecto de ensayo: ${refDeCadena(url)}`);
  console.log(`Proyectos protegidos: ${refDelProyectoReal().join(", ") || "ninguno detectado"}`);

  /* Qué dice cada clave ser, sin mostrarla. Es lo que convierte un «Invalid API
     key» en un diagnóstico. */
  for (const [nombre, esperado] of [
    ["ENSAYO_PUBLISHABLE_KEY", "anon"],
    ["ENSAYO_SERVICE_ROLE_KEY", "service_role"],
  ]) {
    const valor = process.env[nombre];
    if (!valor) {
      console.log(`${nombre}: sin cargar`);
      continue;
    }
    const { rol, ref, sobra } = describirClave(valor);
    const notas = [
      rol === esperado ? "rol correcto" : `ROL EQUIVOCADO: dice «${rol}»`,
      ref === null ? "proyecto no declarado" : `proyecto ${ref}`,
      sobra ? "TIENE ESPACIOS ALREDEDOR" : null,
    ].filter(Boolean);
    console.log(`${nombre}: ${notas.join(", ")}`);
  }
} else if (accion === "push") {
  await correr(process.execPath, [CLI, "db", "push", "--db-url", urlDeEnsayo()]);
} else if (accion === "estructura") {
  const archivo = process.argv[3] ?? "supabase/tests/remote/fase2-audit.sql";
  await correr(process.execPath, [CLI, "db", "query", "--db-url", urlDeEnsayo(), "--file", archivo]);
} else if (accion === "rls") {
  /* El recorrido de aislamiento habla por la API de datos, no por SQL, así que
     necesita las claves del proyecto de ensayo. Se le pasan con los nombres que
     ya espera, en vez de cambiar el script probado. */
  const refEnsayo = refDeCadena(urlDeEnsayo());
  const url = process.env.ENSAYO_URL;
  const publica = process.env.ENSAYO_PUBLISHABLE_KEY;
  const servicio = process.env.ENSAYO_SERVICE_ROLE_KEY;

  const faltantes = [
    ["ENSAYO_URL", url],
    ["ENSAYO_PUBLISHABLE_KEY", publica],
    ["ENSAYO_SERVICE_ROLE_KEY", servicio],
  ]
    .filter(([, valor]) => !valor)
    .map(([nombre]) => nombre);

  if (faltantes.length > 0) {
    fallar(
      `Faltan en .env.local: ${faltantes.join(", ")}.\n` +
        "Salen de Supabase → mipuesto-ensayo → Project Settings → API.",
    );
  }

  /* Que las claves sean del mismo proyecto que la base.
     Mezclar el proyecto de una con el de otras da «Invalid API key», que suena
     a clave mal copiada y en realidad es una clave correcta del proyecto
     equivocado. */
  const refDeLaApi = /^https:\/\/([a-z0-9]+)\.supabase\.(co|in)\/?$/i.exec(url.trim())?.[1];
  if (!refDeLaApi) {
    fallar(
      `ENSAYO_URL no es la dirección de un proyecto de Supabase: «${url}»\n` +
        "Tiene que verse así:  https://<ref>.supabase.co",
    );
  }
  if (refDeLaApi !== refEnsayo) {
    fallar(
      "ENSAYO_URL y ENSAYO_DB_URL son de proyectos distintos.\n" +
        `  La dirección de la API apunta a: ${refDeLaApi}\n` +
        `  La cadena de conexión apunta a:  ${refEnsayo}\n\n` +
        "Las cuatro variables ENSAYO_* tienen que salir del mismo proyecto.",
    );
  }

  comprobarClave("ENSAYO_PUBLISHABLE_KEY", publica, "anon", refEnsayo);
  comprobarClave("ENSAYO_SERVICE_ROLE_KEY", servicio, "service_role", refEnsayo);

  /* Se recortan al pasarlas: un salto de línea invisible al final de una clave
     pegada desde el navegador da el mismo «Invalid API key» que una clave mal
     copiada, y encontrarlo mirando el archivo es casi imposible. */
  await correr(process.execPath, ["scripts/test-rls-multitenant.mjs"], {
    NEXT_PUBLIC_SUPABASE_URL: url.trim(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publica.trim(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    SUPABASE_SERVICE_ROLE_KEY: servicio.trim(),
  });
} else {
  console.error("Uso: node scripts/ensayo.mjs <ver|push|estructura|rls>");
  process.exit(1);
}
