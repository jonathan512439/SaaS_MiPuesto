/* Las fotos se guardan en WebP porque es lo que menos pesa en el celular del
 * cliente, pero el generador de imágenes para compartir solo rasteriza PNG y
 * JPEG. En vez de guardar una segunda copia de cada foto —que duplicaría el
 * consumo del almacenamiento gratuito— se le pide a Supabase que la entregue
 * convertida al vuelo, solo cuando alguien pega el enlace en una conversación.
 *
 * Si esa conversión no estuviera disponible, la tarjeta se arma sin fotografía:
 * por eso quien la use debe comprobar el tipo antes de rasterizarla.
 */

import { esRutaDeAlmacenamiento } from "../rutas-de-almacenamiento";

const ANCHO_VISTA_PREVIA = 800;
const CALIDAD_VISTA_PREVIA = 72;

function rutaSegura(ruta: string) {
  return ruta
    .split("/")
    .map((segmento) => encodeURIComponent(segmento))
    .join("/");
}

export function construirUrlVistaPrevia(
  urlSupabase: string,
  deposito: "productos" | "negocios",
  ruta: string | null,
): string | null {
  /* Esta dirección la pide el servidor. Solo una ruta del depósito: la columna
     la puede escribir el dueño con su sesión, y una dirección `https://` puesta
     ahí mandaba al servidor a pedirla (`lib/rutas-de-almacenamiento.ts`). */
  if (!esRutaDeAlmacenamiento(ruta)) return null;
  const base = urlSupabase.replace(/\/$/, "");
  /* Sin `resize=contain`, Supabase conserva el alto original y recorta con
     `cover`: la foto llegaba como una franja de su centro. */
  return `${base}/storage/v1/render/image/public/${deposito}/${rutaSegura(ruta)}?width=${ANCHO_VISTA_PREVIA}&resize=contain&quality=${CALIDAD_VISTA_PREVIA}`;
}

const TIPOS_RASTERIZABLES = ["image/png", "image/jpeg"];

export async function obtenerFotoRasterizable(origen: string | null) {
  if (!origen) return null;
  try {
    const respuesta = await fetch(origen, { method: "HEAD" });
    const tipo = respuesta.headers.get("content-type")?.split(";")[0].trim() ?? "";
    return respuesta.ok && TIPOS_RASTERIZABLES.includes(tipo) ? origen : null;
  } catch {
    return null;
  }
}
