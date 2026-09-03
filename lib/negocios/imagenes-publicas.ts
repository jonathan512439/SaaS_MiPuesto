export function obtenerUrlPublicaImagenNegocio(urlSupabase: string, ruta: string | null) {
  if (!ruta) return null;
  if (ruta.startsWith("https://")) return ruta;
  const base = urlSupabase.replace(/\/$/, "");
  const rutaSegura = ruta
    .split("/")
    .map((segmento) => encodeURIComponent(segmento))
    .join("/");
  return `${base}/storage/v1/object/public/negocios/${rutaSegura}`;
}
