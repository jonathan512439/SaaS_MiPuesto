import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../supabase/database.types";
import type { ZonaConCentro } from "./coordenadas";
import { esRubroPublicoId } from "./rubros-publicos";

/* Lo que necesita «Qué vendés y dónde» para dibujarse, leído una vez y de una
 * forma. Lo usan el paso 2 del alta y «Mi negocio»: si cada pantalla armara su
 * consulta, una se olvidaría de una columna y el mismo negocio se vería
 * distinto en las dos.
 *
 * Las coordenadas se leen con la sesión del dueño, que las tiene concedidas.
 * El público no: esa es la regla de la fase 11.
 */
const COLUMNAS =
  "rubro,rubro_bloqueado_en,rubro_publico,rubros_secundarios,aparece_en_directorio,ciudad,ubicacion_lat,ubicacion_lng,zona_id,zona_propuesta,ubicacion_url";

export async function leerPresenciaDelNegocio(
  supabase: SupabaseClient<Database>,
  idUsuario: string,
) {
  const [{ data: negocio }, { data: zonas }] = await Promise.all([
    supabase.from("negocios").select(COLUMNAS).eq("admin_user_id", idUsuario).maybeSingle(),
    supabase
      .from("zonas")
      .select("id,ciudad,nombre,latitud,longitud")
      .eq("activa", true)
      .order("nombre"),
  ]);

  if (!negocio) return null;

  const tienePunto = negocio.ubicacion_lat !== null && negocio.ubicacion_lng !== null;

  return {
    inicial: {
      rubroPublico: esRubroPublicoId(negocio.rubro_publico) ? negocio.rubro_publico : "",
      rubrosSecundarios: (negocio.rubros_secundarios ?? []).filter(esRubroPublicoId),
      aparece: negocio.aparece_en_directorio,
      ciudad: negocio.ciudad ?? "",
      ubicacion: tienePunto
        ? { lat: Number(negocio.ubicacion_lat), lng: Number(negocio.ubicacion_lng) }
        : null,
      zonaId: negocio.zona_id,
      zonaPropuesta: negocio.zona_propuesta ?? "",
    },
    zonas: (zonas ?? []).map(
      (zona): ZonaConCentro => ({
        id: zona.id,
        ciudad: zona.ciudad,
        nombre: zona.nombre,
        latitud: Number(zona.latitud),
        longitud: Number(zona.longitud),
      }),
    ),
    enlaceMaps: negocio.ubicacion_url?.trim() || null,
    rubroFijo: Boolean(negocio.rubro_bloqueado_en),
  };
}
