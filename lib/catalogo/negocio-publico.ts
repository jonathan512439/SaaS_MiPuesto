import { crearClienteSupabasePublico } from "../supabase/public";

/* Esta consulta estuvo cacheada con `unstable_cache` y una etiqueta que las
 * rutas del panel invalidaban al guardar. La invalidación no funcionaba: cada
 * isolate del Worker tiene su propia copia en memoria, así que borrarla en el
 * que atendió el guardado no toca la del que sirve el catálogo. Lo único que
 * llegaba a ocurrir era la expiración por tiempo, cinco minutos después.
 *
 * El efecto para el dueño era que cambiaba su plantilla o su paleta, abría su
 * catálogo y no veía nada distinto. Sin forma de saber si había guardado bien,
 * la única lectura posible era «no funciona».
 *
 * Media respuesta caché es peor que ninguna cuando no se puede invalidar, así
 * que se quitó. Lo que costaba en tiempo se recupera pidiendo los productos en
 * paralelo con el resto en vez de esperar a las categorías.
 */
const CAMPOS =
  "id,slug,nombre,descripcion,tipo_negocio,telefono_whatsapp,horario,paleta_id,logo_url,portada_url,qr_pago_url,redes_sociales,banners,ubicacion_url,pide_numero_mesa,resenas_url,rubro,patron_fondo,patron_opacidad,subnombre,activo";

export async function obtenerNegocioPublico(slug: string) {
  const supabase = crearClienteSupabasePublico();
  const { data, error } = await supabase
    .from("negocios")
    .select(CAMPOS)
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();
  if (error) throw new Error("No se pudo consultar el negocio público.");
  return data;
}
