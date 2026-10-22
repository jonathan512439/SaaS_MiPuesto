import type { SupabaseClient } from "@supabase/supabase-js";

import { esPrueba } from "../planes";
import type { Database } from "../supabase/database.types";

/* Cuántas lecturas de foto lleva usadas un negocio, contadas como las cuenta su
 * plan.
 *
 * `uso_ia_negocio` guarda una fila por mes, con el mes como su día 1 en hora de
 * Bolivia. Un plan pago se mide por mes, así que basta la fila de este. La
 * prueba gratis trae sus lecturas **en total** (`PLAN_PRUEBA`): se suman todas
 * las filas, que para un negocio en prueba son a lo sumo dos —quince días
 * cruzan como mucho un fin de mes—.
 *
 * Lo usan el panel, para mostrar «llevas tantas», y el servidor, para descontar
 * de la prueba lo que ya gastó en el mes anterior. Las dos cuentas tienen que
 * salir de la misma función: si el panel dijera 3 y el servidor contara 5, el
 * dueño vería un cupo que no puede usar. */

/* El mes en curso como lo guarda la base: su día 1, en hora de Bolivia. */
export function mesEnCurso(ahora: Date = new Date()): string {
  const [anio, mes] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
  })
    .format(ahora)
    .split("-");
  return `${anio}-${mes}-01`;
}

function sumar(filas: { cantidad: number }[] | null): number {
  return (filas ?? []).reduce((total, fila) => total + fila.cantidad, 0);
}

export async function leerLecturasUsadas(
  supabase: SupabaseClient<Database>,
  negocioId: string,
  planId: string | null | undefined,
): Promise<number> {
  const consulta = supabase.from("uso_ia_negocio").select("cantidad").eq("negocio_id", negocioId);
  const { data } = esPrueba(planId) ? await consulta : await consulta.eq("mes", mesEnCurso());
  return sumar(data);
}

/* Lo que la prueba ya gastó antes de este mes, para descontarlo de su tope. */
export async function lecturasDeMesesAnteriores(
  supabase: SupabaseClient<Database>,
  negocioId: string,
): Promise<number> {
  const { data } = await supabase
    .from("uso_ia_negocio")
    .select("cantidad")
    .eq("negocio_id", negocioId)
    .lt("mes", mesEnCurso());
  return sumar(data);
}
