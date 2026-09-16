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
import { readFileSync } from "node:fs";
const fuente = readFileSync(new URL("../lib/catalogo/negocio-publico.ts", import.meta.url), "utf8");
const DEL_VISITANTE = /const CAMPOS =\s*"([^"]+)"/.exec(fuente)?.[1].split(",") ?? [];

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

if (faltan.length > 0) {
  console.error("\nFaltan permisos de columna en `negocios`:");
  for (const falta of faltan) console.error(`  - ${falta}`);
  console.error(
    "\nSe arregla con una migración:\n" +
      "  grant update (la_columna) on public.negocios to authenticated;\n" +
      "  grant select (la_columna) on public.negocios to anon;",
  );
  process.exit(1);
}

console.log(
  `Permisos de columna: correcto. ${DEL_DUENO.length} escribibles por el dueño, ` +
    `${DEL_VISITANTE.length} legibles por un visitante.`,
);
