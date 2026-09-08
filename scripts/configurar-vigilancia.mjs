/* Configura a dónde pregunta el vigilante y a dónde avisa.
 *
 *   npm run vigilancia:configurar -- --aviso "https://ntfy.sh/mi-tema-largo-y-dificil"
 *   npm run vigilancia:configurar -- --sitio "https://mipuesto.com"
 *   npm run vigilancia:configurar -- --ver
 *
 * **Sin dirección de aviso, el vigilante anota y no avisa.** Eso deja resuelta
 * la mitad del problema: queda el registro para mirarlo después, pero una caída
 * un domingo se sigue descubriendo cuando escribe un cliente, que es justo lo
 * que había que evitar.
 *
 * Sirve cualquier dirección que acepte un POST con texto plano. La más barata es
 * ntfy.sh: se elige un tema difícil de adivinar, se instala su aplicación en el
 * teléfono y no hace falta cuenta ni tarjeta. El tema es la única llave, así que
 * conviene que sea largo: quien lo adivine puede mandarte avisos falsos.
 *
 * Va por SQL y no por la API de datos porque los ajustes viven en el esquema
 * `private`, que PostgREST no expone —ni siquiera con la clave privilegiada—.
 * Esa es la idea: la dirección de aviso es una llave y no tiene por qué estar al
 * alcance de una consulta.
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

function leerArgumento(nombre) {
  const posicion = process.argv.indexOf(`--${nombre}`);
  return posicion > -1 ? process.argv[posicion + 1] : undefined;
}

const soloVer = process.argv.includes("--ver");
const soloProbar = process.argv.includes("--probar");
const inventarTema = process.argv.includes("--inventar-tema");
const aviso = leerArgumento("aviso");
const sitio = leerArgumento("sitio");

if (inventarTema) {
  /* Un tema inventado acá y no copiado de la documentación.
   *
   * El ejemplo que traía el manual terminó usado tal cual, y un ejemplo escrito
   * en un archivo versionado no es un secreto: en ntfy el tema **es** la llave,
   * y quien la tenga puede mandar avisos falsos y leer los verdaderos, o sea
   * enterarse de cuándo se cae el sitio. Doce bytes al azar son suficientes para
   * que no se adivine y cortos para poder escribirlos en el teléfono. */
  console.log(`https://ntfy.sh/mipuesto-${randomBytes(9).toString("base64url")}`);
  process.exit(0);
}

if (!soloVer && !soloProbar && aviso === undefined && sitio === undefined) {
  console.error(
    "Uso: npm run vigilancia:configurar -- [--sitio URL] [--aviso URL] [--ver] [--probar] [--inventar-tema]",
  );
  process.exit(1);
}

/* Las dos direcciones terminan dentro de una sentencia SQL, así que se
   comprueban antes de escribirlas y se duplican las comillas simples. Una
   dirección es texto que escribe una persona, y el día que alguien pegue algo
   raro conviene que el peor caso sea un error y no una sentencia de más. */
function comoLiteralSql(valor) {
  if (valor === null) return "null";
  return `'${valor.replaceAll("'", "''")}'`;
}

function validarDireccion(valor, nombre) {
  let direccion;
  try {
    direccion = new URL(valor);
  } catch {
    throw new Error(`La dirección de ${nombre} no es válida: ${valor}`);
  }
  if (direccion.protocol !== "https:") {
    throw new Error(`La dirección de ${nombre} tiene que ser https.`);
  }
  return direccion;
}

/* Se llama al CLI de Supabase por su archivo y sin shell.
 *
 * Con `shell: true` en Windows, un argumento con espacios se parte en dos: la
 * carpeta temporal de este equipo vive bajo «Program Files» y el CLI recibía
 * «D:\Program». Sin shell, cada argumento llega entero sin depender de comillas.
 */
function ejecutarSql(archivo) {
  return new Promise((resolver, rechazar) => {
    const cli = join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js");
    const proceso = spawn(
      process.execPath,
      [cli, "db", "query", "--linked", "--file", archivo],
      { stdio: "inherit" },
    );
    proceso.on("error", rechazar);
    proceso.on("exit", (codigo) =>
      codigo === 0 ? resolver() : rechazar(new Error(`supabase terminó con código ${codigo}.`)),
    );
  });
}

let sql;

if (soloProbar) {
  /* Un canal de aviso que nunca se probó es exactamente como un respaldo que
     nunca se restauró: se cree que está y se descubre que no el peor día. Este
     envío sale por el mismo camino que usaría una caída de verdad —la misma
     función, desde la misma base— así que si el teléfono suena, el aviso
     funciona. */
  sql = `select
  case
    when a.url_aviso is null then 'No hay dirección de aviso configurada.'
    else 'Enviado con código HTTP ' ||
      (extensions.http_post(
        a.url_aviso,
        'Prueba de MiPuesto: si leés esto, el aviso de caída funciona.',
        'text/plain'
      )).status::text
  end as resultado
from private.ajustes_vigilancia a where a.id;`;
} else if (soloVer) {
  /* La dirección de aviso se muestra recortada: sirve para saber si está puesta,
     y el final es la parte que funciona como llave. */
  sql = `select
  url_salud as "pregunta a",
  case
    when url_aviso is null then 'NADIE: anota la caída y no la cuenta'
    else regexp_replace(url_aviso, '[^/]+$', '…')
  end as "avisa a"
from private.ajustes_vigilancia where id;`;
} else {
  const asignaciones = [];

  if (sitio !== undefined) {
    const base = validarDireccion(sitio, "sitio");
    /* Se guarda la dirección de la comprobación y no la de la portada: la
       portada carga aunque la base esté caída, y el vigilante diría «sano»
       mirando el semáforo equivocado. */
    const rutaSalud = `${base.origin}/api/salud`;
    asignaciones.push(`url_salud = ${comoLiteralSql(rutaSalud)}`);
  }

  if (aviso !== undefined) {
    const destino = aviso === "" ? null : validarDireccion(aviso, "aviso").toString();
    asignaciones.push(`url_aviso = ${comoLiteralSql(destino)}`);
  }

  sql = `update private.ajustes_vigilancia set ${asignaciones.join(", ")} where id;

select
  url_salud as "pregunta a",
  case when url_aviso is null then 'no avisa' else 'avisa' end as "estado del aviso"
from private.ajustes_vigilancia where id;`;
}

const carpeta = await mkdtemp(join(resolve(tmpdir()), "mipuesto-vigilancia-"));
const archivo = join(carpeta, "vigilancia.sql");

try {
  await writeFile(archivo, sql, { encoding: "utf8", mode: 0o600 });
  await ejecutarSql(archivo);
} finally {
  await rm(carpeta, { recursive: true, force: true });
}
