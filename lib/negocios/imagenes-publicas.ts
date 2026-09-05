/* Anchos por rol, no por capricho: son los que cada imagen ocupa de verdad en
 * pantalla, con margen para pantallas de alta densidad. La portada del catálogo
 * se servía cruda —106 KB medidos en producción, y es la primera imagen que
 * pide el navegador— porque este constructor devolvía la ruta del archivo tal
 * cual mientras las fotos de producto sí pasaban por el transformador.
 */
export const ANCHO_PORTADA = 1200;
export const ANCHO_LOGO = 256;
export const ANCHO_QR = 640;
const CALIDAD = 78;

export type RolImagenNegocio = "portada" | "logo" | "qr" | "original";

const ANCHOS: Record<Exclude<RolImagenNegocio, "original">, number> = {
  portada: ANCHO_PORTADA,
  logo: ANCHO_LOGO,
  qr: ANCHO_QR,
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

  return `${base}/storage/v1/render/image/public/negocios/${segura}?width=${ANCHOS[rol]}&quality=${CALIDAD}`;
}
