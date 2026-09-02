export function obtenerUrlPublicaImagenProducto(urlSupabase: string, ruta: string) {
  const base = urlSupabase.replace(/\/$/, "");
  const rutaSegura = ruta
    .split("/")
    .map((segmento) => encodeURIComponent(segmento))
    .join("/");
  return `${base}/storage/v1/object/public/productos/${rutaSegura}`;
}
