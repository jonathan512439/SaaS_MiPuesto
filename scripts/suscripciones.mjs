/* Operación de suscripciones desde la máquina de quien vende.
 *
 * SECURITY.md dice que no se construya un panel de super-admin en las primeras
 * fases y que se use la consola de Supabase hasta que administrar a mano duela.
 * Este script quita el dolor sin abrir la puerta: la clave privilegiada se pide
 * a la sesión local del CLI y nunca llega a producción, así que no hay una
 * pantalla más que proteger ni un secreto más que rotar.
 *
 *   npm run suscripcion:ver
 *   npm run suscripcion:renovar -- mi-negocio 1
 */
import { createClient } from "@supabase/supabase-js";

import { obtenerClaveServicioLocal } from "./servicio-supabase-local.mjs";

const MESES_MAXIMOS = 12;
const [accion, slug, mesesTexto] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL.");
if (accion !== "ver" && accion !== "renovar") {
  throw new Error(
    "Uso: npm run suscripcion:ver  |  npm run suscripcion:renovar -- <slug> [meses]",
  );
}

const supabase = createClient(url, await obtenerClaveServicioLocal(), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const formatearFecha = new Intl.DateTimeFormat("es-BO", {
  timeZone: "America/La_Paz",
  dateStyle: "medium",
});

function describir(vence) {
  const dias = Math.round((new Date(vence) - Date.now()) / 86400000);
  if (dias < 0) return `vencida hace ${Math.abs(dias)} d`;
  if (dias === 0) return "vence hoy";
  return `${dias} d`;
}

async function ver() {
  const { data, error } = await supabase
    .from("negocios")
    .select("slug,nombre,activo,suscripcion_vence_en")
    .order("suscripcion_vence_en");
  if (error) throw new Error(`No se pudo leer los negocios: ${error.message}`);

  console.log(
    ["ESTADO".padEnd(18), "SLUG".padEnd(22), "VENCE".padEnd(14), "NEGOCIO"].join(" "),
  );
  for (const negocio of data) {
    const publicado = negocio.activo ? "" : " (fuera de línea)";
    console.log(
      [
        describir(negocio.suscripcion_vence_en).padEnd(18),
        negocio.slug.padEnd(22),
        formatearFecha.format(new Date(negocio.suscripcion_vence_en)).padEnd(14),
        negocio.nombre + publicado,
      ].join(" "),
    );
  }
}

async function renovar() {
  if (!slug) throw new Error("Falta el slug: npm run suscripcion:renovar -- <slug> [meses]");
  const meses = Number(mesesTexto ?? "1");
  if (!Number.isInteger(meses) || meses < 1 || meses > MESES_MAXIMOS) {
    throw new Error(`Los meses deben ser un entero entre 1 y ${MESES_MAXIMOS}.`);
  }

  const { data: negocio, error: errorLectura } = await supabase
    .from("negocios")
    .select("nombre,activo,suscripcion_vence_en")
    .eq("slug", slug)
    .maybeSingle();
  if (errorLectura) throw new Error(`No se pudo leer el negocio: ${errorLectura.message}`);
  if (!negocio) throw new Error(`No existe un negocio con el slug “${slug}”.`);

  /* Si ya venció se cuenta desde hoy, y si sigue vigente se suma al final del
     período pagado: renovar tarde no debe regalar días, y renovar temprano no
     debe quitarlos. */
  const desde = new Date(
    Math.max(Date.now(), new Date(negocio.suscripcion_vence_en).getTime()),
  );
  const nuevaFecha = new Date(desde);
  nuevaFecha.setMonth(nuevaFecha.getMonth() + meses);

  const { error } = await supabase
    .from("negocios")
    .update({ suscripcion_vence_en: nuevaFecha.toISOString(), activo: true })
    .eq("slug", slug);
  if (error) throw new Error(`No se pudo renovar: ${error.message}`);

  console.log(
    `${negocio.nombre}: ${meses} mes(es) sumados. Vence el ${formatearFecha.format(nuevaFecha)}.`,
  );
  if (!negocio.activo) console.log("El catálogo volvió a publicarse.");
}

await (accion === "ver" ? ver() : renovar());
