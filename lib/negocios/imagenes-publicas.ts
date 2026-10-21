import { LADO_MAXIMO_IMAGEN } from "../imagenes";

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
 * Se tomó 800 px con calidad 70: por debajo de esa calidad el ahorro se paga
 * con una portada visiblemente sucia detrás del nombre del negocio.
 *
 * **La portada y el banner se piden ahora a 1200**, el lado más largo que se
 * guarda (`LADO_MAXIMO_IMAGEN`). A 800 se veían borrosos en la computadora,
 * donde la columna del catálogo mide 1152 de ancho y el navegador estiraba la
 * imagen casi al doble; el dueño lo vio el 2026-10-21. Pesa más, pero es una
 * sola imagen, y una portada borrosa no se arregla con nada que haga el dueño.
 */
export const ANCHO_PORTADA = LADO_MAXIMO_IMAGEN;
export const ANCHO_LOGO = 192;
export const ANCHO_QR = 640;
/* El banner ocupa el ancho del catálogo, igual que la portada, así que se sirve
   con la misma medida y por el mismo motivo. */
export const ANCHO_BANNER = LADO_MAXIMO_IMAGEN;
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
