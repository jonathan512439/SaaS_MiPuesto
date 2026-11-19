const URL_LOCAL = "http://localhost:3000";

/* La dirección con que MiPuesto se presenta al dueño: «mi-puesto.com/tu-negocio».
   Con guion: el dominio sin guion lo tiene un tercero desde 2004. Decidido por
   el dueño el 2026-09-25. El sitio sirve desde `NEXT_PUBLIC_SITE_URL`; esto es
   solo lo que se escribe en pantalla. */
export const DOMINIO_MIPUESTO = "mi-puesto.com";

/* La dirección desde la que el navegador abrió la página, o nada en el servidor.
 *
 * `NEXT_PUBLIC_SITE_URL` llega al navegador solo si existía **al compilar**:
 * vinext la escribe adentro del código en ese momento. En Workers Builds estaba
 * cargada para atender pero no para compilar, y el navegador recibió
 * `{}.NEXT_PUBLIC_SITE_URL`: «Copiar enlace» de un producto copiaba
 * `http://localhost:3000/…` y Plataforma decía que mi-puesto.com no estaba
 * conectado (2026-11-19). Sin la variable, la dirección de la propia página es
 * la respuesta correcta: el panel siempre se abre desde el sitio. */
function origenDelNavegador(): string | undefined {
  return typeof window === "undefined" ? undefined : window.location.origin;
}

export function obtenerUrlBaseSitio(
  valor = process.env.NEXT_PUBLIC_SITE_URL || origenDelNavegador(),
) {
  try {
    const url = new URL(valor || URL_LOCAL);
    if (url.protocol !== "http:" && url.protocol !== "https:") return URL_LOCAL;
    return url.origin;
  } catch {
    return URL_LOCAL;
  }
}
export function construirUrlPublicaNegocio(slug: string, base?: string) {
  return new URL(`/${encodeURIComponent(slug)}`, obtenerUrlBaseSitio(base)).toString();
}

/* Adónde lleva tocar un producto: a su página.
 *
 * Es relativa porque se usa **adentro** del catálogo, donde el navegador ya
 * está en el sitio y una dirección completa obligaría a recargar entero.
 * `construirUrlPublicaProducto` la envuelve para lo que sale afuera —el enlace
 * que el dueño comparte por WhatsApp, la etiqueta canónica del buscador—, y así
 * la forma de la dirección se escribe una sola vez: si mañana la página del
 * producto se mueve, se mueve acá. */
export function rutaProductoPublico(slug: string, codigo: string) {
  return `/${encodeURIComponent(slug)}/p/${encodeURIComponent(codigo)}`;
}

export function construirUrlPublicaProducto(slug: string, codigo: string, base?: string) {
  return new URL(rutaProductoPublico(slug, codigo), obtenerUrlBaseSitio(base)).toString();
}
