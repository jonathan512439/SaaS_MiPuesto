/* Toda columna que el panel escribe tiene que estar concedida al dueño.
 *
 * `negocios` no concede permisos sobre la tabla entera: los concede **columna
 * por columna**, para que el panel pueda tocar el nombre pero no `verificado`,
 * `activo` ni la fecha de suscripción. Es lo correcto, y tiene un filo que ya
 * cortó dos veces: **una columna nueva no queda concedida sola**.
 *
 *   · Fase 7, lectura: `patron_opacidad` y `subnombre` entraron en la consulta
 *     del catálogo sin conceder, y durante un despliegue entero **ningún
 *     catálogo público cargó**.
 *   · Fase 8, escritura: las mismas más las del alta quedaron sin `update`. El
 *     paso 1 fallaba sin decir por qué, y el subnombre y la intensidad del fondo
 *     nunca se guardaron: el panel mostraba el control, el dueño lo movía y la
 *     escritura se rechazaba en silencio.
 *
 * Ninguna de las dos la atrapó nada: no lo ve el compilador, no lo ve el lint, y
 * las pruebas corren sin base. Esta guarda compara contra la base de verdad.
 *
 * La lista de abajo es **una decisión, no un reflejo**: dice qué es del dueño.
 * Agregar una columna y sumarla acá obliga a preguntarse si de verdad la edita
 * él, que es la pregunta que se saltea cuando el permiso se copia y pega.
 *
 * Uso: npm run test:permisos:linked
 */
import { createClient } from "@supabase/supabase-js";

import { obtenerClaveServicioLocal } from "./servicio-supabase-local.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) {
  throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL. Corré con --env-file-if-exists=.env.local.");
}

/* La misma vía que usan las otras pruebas enlazadas: si la clave no está en el
   entorno, se la pide al proyecto enlazado. Así esto corre recién clonado el
   repositorio, sin tener que llenar una variable a mano. */
const claveServicio = await obtenerClaveServicioLocal();

/* Lo que el dueño edita desde su panel. */
const DEL_DUENO = [
  "nombre", "slug", "descripcion", "subnombre", "telefono_whatsapp", "tipo_negocio",
  "horario", "reserva_minutos", "rubro", "ciudad", "zona", "pide_numero_mesa",
  "logo_url", "portada_url", "qr_pago_url", "banners", "redes_sociales",
  "ubicacion_url", "resenas_url", "direccion_manual",
  "paleta_id", "patron_fondo", "patron_opacidad",
  "nombre_admin", "alta_paso", "alta_completada_en", "rubro_bloqueado_en",
  "maps_visible",
];

/* Lo que el catálogo público lee. Se saca del propio archivo, no de una copia. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
const fuente = readFileSync(new URL("../lib/catalogo/negocio-publico.ts", import.meta.url), "utf8");
const DEL_VISITANTE = /const CAMPOS =\s*"([^"]+)"/.exec(fuente)?.[1].split(",") ?? [];

/* Lo que el **panel** lee de `negocios`, sacado de las consultas de verdad.
 *
 * Esta lista faltaba, y por eso `plan_id` tumbó «Productos» y «Mi catálogo»: se
 * cuidó de no conceder su escritura —para que nadie se ascienda solo— y se pasó
 * por alto la lectura. La consulta la pedía, la base la rechazaba, y se caía
 * entera con ella.
 *
 * Se descubre recorriendo el código en vez de mantenerse a mano, por el mismo
 * motivo que la del visitante: una lista escrita al lado de la consulta se
 * desactualiza en cuanto alguien agrega una columna y no se acuerda de esto. */
function archivosDeCodigo(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivosDeCodigo(ruta);
    return [".ts", ".tsx"].includes(extname(nombre)) ? [ruta] : [];
  });
}

const raiz = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const DEL_PANEL = new Set();
for (const carpeta of ["lib", "app", "components"]) {
  for (const archivo of archivosDeCodigo(join(raiz, carpeta))) {
    if (archivo.includes(".test.")) continue;
    const codigo = readFileSync(archivo, "utf8");
    /* `.from("negocios")` y, más adelante, su `.select("…")`. Se toma el primer
       select que aparezca después: es el de esa consulta. */
    for (const encuentro of codigo.matchAll(/\.from\("negocios"\)([\s\S]{0,400}?)\.select\(\s*"([^"]+)"/g)) {
      for (const columna of encuentro[2].split(",")) {
        const limpia = columna.trim().split("(")[0].trim();
        /* Las relaciones embebidas —`agenda_recurso(...)`— no son columnas de
           `negocios` y no se comprueban acá. */
        if (limpia && !limpia.includes(")") && !encuentro[2].includes(`${limpia}(`)) {
          DEL_PANEL.add(limpia);
        }
      }
    }
  }
}

const admin = createClient(url, claveServicio, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await admin.rpc("permisos_de_columnas_negocios");
if (error) {
  console.error("No se pudieron leer los permisos:", error.message);
  process.exit(1);
}

const concedido = new Map();
for (const fila of data ?? []) {
  const clave = `${fila.grantee}:${fila.privilege_type}`;
  if (!concedido.has(clave)) concedido.set(clave, new Set());
  concedido.get(clave).add(fila.column_name);
}

const faltan = [];
for (const columna of DEL_DUENO) {
  if (!concedido.get("authenticated:UPDATE")?.has(columna)) {
    faltan.push(`authenticated no puede escribir «${columna}»`);
  }
}
for (const columna of DEL_VISITANTE) {
  if (!concedido.get("anon:SELECT")?.has(columna)) {
    faltan.push(`anon no puede leer «${columna}», y el catálogo público la pide`);
  }
}
for (const columna of DEL_PANEL) {
  if (!concedido.get("authenticated:SELECT")?.has(columna)) {
    faltan.push(`authenticated no puede leer «${columna}», y una consulta del panel la pide`);
  }
}

if (faltan.length > 0) {
  console.error("\nFaltan permisos de columna en `negocios`:");
  for (const falta of faltan) console.error(`  - ${falta}`);
  console.error(
    "\nSe arregla con una migración:\n" +
      "  grant update (la_columna) on public.negocios to authenticated;\n" +
      "  grant select (la_columna) on public.negocios to authenticated;\n" +
      "  grant select (la_columna) on public.negocios to anon;",
  );
  process.exit(1);
}

console.log(
  `Permisos de columna: correcto. ${DEL_DUENO.length} escribibles por el dueño, ` +
  `${DEL_PANEL.size} legibles por el panel, ` +
    `${DEL_VISITANTE.length} legibles por un visitante.`,
);
