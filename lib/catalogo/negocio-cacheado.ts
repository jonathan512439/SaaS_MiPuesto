import { unstable_cache } from "next/cache";

import { crearClienteSupabasePublico } from "../supabase/public";

/* El catálogo público resuelve en dos fases: primero busca el negocio por su
 * dirección y recién después consulta categorías, productos y promociones en
 * paralelo. Esa primera consulta está sola en el camino crítico, así que cuesta
 * un viaje entero de ida y vuelta en cada visita.
 *
 * Se cachea solo esa fase. Lo que devuelve —nombre, descripción, plantilla,
 * paleta, teléfono, horario— cambia cuando el dueño edita su perfil y no cuando
 * alguien compra, de modo que aquí no hay riesgo de mostrar existencias viejas:
 * productos y promociones se siguen leyendo frescos en cada visita.
 */
export function etiquetaNegocio(slug: string) {
  return `negocio-${slug}`;
}

const CAMPOS =
  "id,slug,nombre,descripcion,tipo_negocio,telefono_whatsapp,horario,plantilla_id,paleta_id,logo_url,portada_url,qr_pago_url,redes_sociales,activo";

export function obtenerNegocioPublicoCacheado(slug: string) {
  return unstable_cache(
    async () => {
      const supabase = crearClienteSupabasePublico();
      const { data, error } = await supabase
        .from("negocios")
        .select(CAMPOS)
        .eq("slug", slug)
        .eq("activo", true)
        .maybeSingle();
      if (error) throw new Error("No se pudo consultar el negocio público.");
      return data;
    },
    ["negocio-publico", slug],
    /* La revalidación por tiempo es la red por si una invalidación se pierde;
       la vía normal es la etiqueta, que las rutas del panel disparan al
       guardar con expire 0, para que el dueño vea su cambio al instante y no
       una versión vieja mientras se refresca por detrás. */
    { tags: [etiquetaNegocio(slug)], revalidate: 300 },
  )();
}
