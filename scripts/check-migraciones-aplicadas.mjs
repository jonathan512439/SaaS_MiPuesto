/* Ningún despliegue sale si la base no tiene todavía sus migraciones.
 *
 * Subir a `main` despliega solo (Workers Builds) y las migraciones se aplican
 * aparte, a mano, con `npm run supabase:push`. El 2026-10-13 el código de la
 * auditoría salió antes que sus dos migraciones y, hasta aplicarlas, el ajuste
 * de precios y las fotos respondieron 500: llamaban funciones que no existían.
 *
 * Corre como `predeploy:vinext`, así que frena tanto el despliegue local como
 * el de Cloudflare. El build de Cloudflare no tiene acceso a la base, así que
 * le pregunta al sitio: `/api/salud` informa la última migración aplicada
 * (`esquema_aplicado()`) y acá se compara con la última del repositorio.
 *
 * El orden correcto es siempre el mismo: primero `npm run supabase:push`,
 * después subir el código.
 *
 * - Si al sitio le falta una migración, no despliega y dice cuáles.
 * - Si el sitio todavía no informa su esquema —el código de antes de esta
 *   guardia—, avisa y deja pasar: es la única forma de que salga la primera
 *   vez.
 * - Si no puede preguntar —el sitio caído, una respuesta que no se entiende—,
 *   no despliega. Para sacar un arreglo con el sitio caído y la base al día:
 *   `DESPLEGAR_SIN_MIRAR_MIGRACIONES=1`, en la terminal o en las variables del
 *   build de Cloudflare, y se quita después.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const carpeta = process.env.MIGRACIONES_DIR ?? join(raiz, "supabase", "migrations");
const sitio = (
  process.env.SITIO_SALUD ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://mipuesto-dev.mipuesto-app.workers.dev"
).replace(/\/$/, "");

const migraciones = readdirSync(carpeta)
  .filter((archivo) => /^\d{14}_.*\.sql$/.test(archivo))
  .sort();
const ultima = migraciones.at(-1)?.slice(0, 14);

function frenar(motivo) {
  console.error(`No se despliega: ${motivo}`);
  console.error(
    "Si el sitio está caído y la base ya está al día, se puede desplegar igual con " +
      "DESPLEGAR_SIN_MIRAR_MIGRACIONES=1.",
  );
  process.exit(1);
}

if (process.env.DESPLEGAR_SIN_MIRAR_MIGRACIONES === "1") {
  console.warn("Migraciones: sin revisar, por DESPLEGAR_SIN_MIRAR_MIGRACIONES. Quítala después.");
  process.exit(0);
}
if (!ultima) {
  console.log("Migraciones: el repositorio no tiene ninguna.");
  process.exit(0);
}

async function preguntarSalud() {
  let ultimoError = "";
  for (let intento = 1; intento <= 3; intento += 1) {
    try {
      const respuesta = await fetch(`${sitio}/api/salud?despliegue=${Date.now()}`, {
        signal: AbortSignal.timeout(15_000),
      });
      return await respuesta.json();
    } catch (error) {
      ultimoError = error instanceof Error ? error.message : String(error);
      if (intento < 3) await new Promise((listo) => setTimeout(listo, 3_000));
    }
  }
  frenar(`no pude preguntarle a ${sitio}/api/salud qué migraciones tiene (${ultimoError}).`);
}

const salud = await preguntarSalud();

if (salud?.estado === "ok" && !("esquema" in salud)) {
  console.warn(
    `Migraciones: ${sitio} todavía no informa su esquema (código anterior a esta guardia). ` +
      `Se deja pasar esta vez; la última del repositorio es ${ultima}.`,
  );
  process.exit(0);
}
if (typeof salud?.esquema !== "string") {
  frenar(`${sitio}/api/salud no dijo qué migraciones tiene (respondió ${JSON.stringify(salud)}).`);
}

const pendientes = migraciones.filter((archivo) => archivo.slice(0, 14) > salud.esquema);
if (pendientes.length > 0) {
  frenar(
    `a la base le faltan ${pendientes.length} migración(es) que este código necesita:\n` +
      pendientes.map((archivo) => `  - ${archivo}`).join("\n") +
      "\nAplícalas con `npm run supabase:push` y vuelve a desplegar.",
  );
}
if (salud.esquema > ultima) {
  console.warn(
    `Migraciones: la base tiene ${salud.esquema}, más nueva que la última de este código (${ultima}). ` +
      "Se despliega igual: una migración nunca borra lo que el código de antes usa.",
  );
  process.exit(0);
}
console.log(`Migraciones: al día (${salud.esquema}).`);
