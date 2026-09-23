import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../supabase/database.types";
import type { Presencia } from "./presencia";

/* Lo que de la presencia solo se puede comprobar contra la base: que la zona
 * elegida exista, esté activa y sea de la ciudad del negocio.
 *
 * Una zona de otra ciudad sería un negocio de Oruro apareciendo en La Paz. El
 * formulario no la ofrece, pero una petición armada a mano sí puede mandarla.
 * Devuelve el error a mostrar, o nulo si está bien.
 */
export async function comprobarZona(
  supabase: SupabaseClient<Database>,
  presencia: Presencia,
): Promise<string | null> {
  if (!presencia.aparece || !presencia.zonaId) return null;

  const { data: zona, error } = await supabase
    .from("zonas")
    .select("id,ciudad")
    .eq("id", presencia.zonaId)
    .eq("activa", true)
    .maybeSingle();

  if (error) return "No se pudo comprobar la zona. Intentá de nuevo.";
  if (!zona) return "Esa zona no existe. Elegí otra de la lista.";
  if (zona.ciudad !== presencia.ciudad) return "Esa zona es de otra ciudad.";
  return null;
}
