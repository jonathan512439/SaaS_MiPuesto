import { PATRON_SLUG, SLUGS_RESERVADOS } from "../negocios/validacion";

/* La portada de cada catálogo se guarda un minuto en la caché de Workers.
 *
 * Con el plan gratuito, Cloudflare corta a los 10 ms de CPU, y dibujar un
 * catálogo cuesta entre 40 y 100. Lo tolera de vez en cuando, pero una
 * dirección que se pasa una y otra vez empieza a responder 503: el 2026-10-31
 * Kallpa Zapatillas y Kantuta Moda daban «Worker exceeded CPU time limit» en
 * cada visita, mientras la misma tienda con `?categoria=` cargaba. Con la copia
 * guardada, la portada se arma una vez por minuto y no en cada visita.
 *
 * Es lo único que se guarda, y por qué es seguro:
 * - **Solo la portada, sin nada en la dirección** (`/kallpa-zapatillas`). Con
 *   búsqueda, categoría o página no: son muchas combinaciones que casi no se
 *   repiten. La navegación interna de vinext lleva `?_rsc=`, así que tampoco
 *   entra ni se mezcla con el HTML.
 * - **Solo lo que es de todos.** El catálogo público es igual para cualquiera:
 *   no lee la sesión (`proxy.ts` no la toca fuera del panel) ni pone cookies.
 *   Si alguna vez llegara con `Set-Cookie`, no se guarda.
 * - **Solo un 200 en HTML.** Un error, un 404 o una redirección pasan derecho.
 * - **El nonce de la CSP se repite durante ese minuto**, siempre junto con la
 *   cabecera que lo nombra. Sigue sin poder adivinarse al armar la página, que
 *   es lo que impide que un contenido guardado de antes lo use.
 * - **El navegador no la guarda** (`max-age=0`): el que recarga pide de nuevo,
 *   y lo que cambia el dueño se ve en menos de un minuto.
 *
 * No reemplaza al plan pago de Workers (`SECURITY.md`, «Pendiente»): las otras
 * direcciones del catálogo y cada minuto nuevo se siguen armando en el Worker. */
export const SEGUNDOS_PORTADA = 60;
export const CACHE_PORTADA = `public, max-age=0, s-maxage=${SEGUNDOS_PORTADA}`;

export function esPortadaDeCatalogo(solicitud: Request): boolean {
  if (solicitud.method !== "GET") return false;
  const url = new URL(solicitud.url);
  if (url.search !== "") return false;
  const tramos = url.pathname.split("/").filter(Boolean);
  if (tramos.length !== 1 || url.pathname.endsWith("/")) return false;
  const [slug] = tramos;
  return PATRON_SLUG.test(slug) && !SLUGS_RESERVADOS.has(slug);
}

/* La respuesta tal cual, salvo que sea la portada de un catálogo lista para
   guardarse: en ese caso, la misma con la cabecera que le pide a la caché que
   la guarde. */
export function conCacheDePortada(solicitud: Request, respuesta: Response): Response {
  if (!esPortadaDeCatalogo(solicitud)) return respuesta;
  if (respuesta.status !== 200) return respuesta;
  if (!(respuesta.headers.get("content-type") ?? "").startsWith("text/html")) return respuesta;
  if (respuesta.headers.has("set-cookie")) return respuesta;
  const guardable = new Response(respuesta.body, respuesta);
  guardable.headers.set("Cache-Control", CACHE_PORTADA);
  return guardable;
}
