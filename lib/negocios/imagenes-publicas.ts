/* Anchos y calidad elegidos midiendo, no estimando. La portada del catálogo se
 * servía cruda —106 KB, y es la primera imagen que pide el navegador— porque
 * este constructor devolvía la ruta tal cual mientras las fotos de producto sí
 * pasaban por el transformador.
 *
 * Al medirlo apareció algo que no se ve venir: **el transformador devuelve JPEG**,
 * así que reducir un WebP puede engordarlo. La misma portada, medida:
 *
 *   cruda (WebP)            106.572 b
 *   1200 px, calidad 78     142.543 b   ← peor que no hacer nada
 *   800 px, calidad 70       71.752 b
 *   800 px, calidad 60       61.261 b
 *
 * Se toma 800 px, que es lo que declara `sizes` en las plantillas, con calidad
 * 70: por debajo de eso el ahorro se paga con una portada visiblemente sucia
 * detrás del nombre del negocio.
 */
export const ANCHO_PORTADA = 800;
export const ANCHO_LOGO = 192;
export const ANCHO_QR = 640;
/* El banner ocupa el ancho del catálogo, igual que la portada, así que se sirve
   con la misma medida y por el mismo motivo: es lo que declara su `sizes`. */
export const ANCHO_BANNER = 800;
const CALIDAD = 70;

export type RolImagenNegocio = "portada" | "logo" | "qr" | "banner" | "original";

const ANCHOS: Record<Exclude<RolImagenNegocio, "original">, number> = {
  portada: ANCHO_PORTADA,
  logo: ANCHO_LOGO,
  qr: ANCHO_QR,
  banner: ANCHO_BANNER,
};

function rutaSegura(ruta: string) {
  return ruta
    .split("/")
    .map((segmento) => encodeURIComponent(segmento))
    .join("/");
}

/* `original` existe para el panel: ahí el dueño revisa lo que subió y tiene que
   ver el archivo, no una versión reducida. */
export function obtenerUrlPublicaImagenNegocio(
  urlSupabase: string,
  ruta: string | null,
  rol: RolImagenNegocio = "original",
) {
  if (!ruta) return null;
  if (ruta.startsWith("https://")) return ruta;

  const base = urlSupabase.replace(/\/$/, "");
  const segura = rutaSegura(ruta);
  if (rol === "original") {
    return `${base}/storage/v1/object/public/negocios/${segura}`;
  }

  /* `resize=contain` no es opcional. Con solo `width`, Supabase conserva el alto
     original y recorta con `cover`: un logo cuadrado de 1024 volvía como una
     franja de 192 × 1024 y el catálogo mostraba su centro. Lo mismo le pasaba a
     la portada, a los banners y al QR de cobro. */
  return `${base}/storage/v1/render/image/public/negocios/${segura}?width=${ANCHOS[rol]}&resize=contain&quality=${CALIDAD}`;
}
