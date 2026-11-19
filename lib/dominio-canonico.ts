import { DOMINIO_MIPUESTO, obtenerUrlBaseSitio } from "./url-sitio";

/* La dirección de siempre del sitio, antes del dominio propio. Todo lo que ya
   se compartió con ella —enlaces por WhatsApp, QR de prueba, correos de
   invitación— tiene que seguir llegando. */
export const DIRECCION_ANTERIOR = "mipuesto-dev.mipuesto-app.workers.dev";

/* Adónde mandar una solicitud que llegó por una dirección que no es la del
 * sitio, o `null` si se atiende ahí mismo.
 *
 * Dos direcciones se mandan a `mi-puesto.com` con la misma ruta y los mismos
 * parámetros: la de `workers.dev` y la que lleva `www`. Así cada catálogo tiene
 * una sola dirección —la que ve Google y la que se comparte— y lo ya impreso o
 * enviado sigue funcionando.
 *
 * **Solo se activa cuando el sitio ya es `mi-puesto.com`** (`NEXT_PUBLIC_SITE_URL`).
 * Mientras siga siendo `workers.dev`, no redirige nada: el cambio de dominio se
 * hace cambiando esa variable, y no hay forma de que este código deje el sitio
 * apuntando a un dominio que todavía no responde.
 *
 * Las direcciones de prueba que crea Workers Builds tienen otro nombre y no se
 * tocan. */
export function destinoCanonico(url: URL, sitio: string = obtenerUrlBaseSitio()): URL | null {
  const canonico = new URL(sitio);
  if (canonico.hostname !== DOMINIO_MIPUESTO) return null;
  const vieneDeOtraDireccion =
    url.hostname === DIRECCION_ANTERIOR || url.hostname === `www.${DOMINIO_MIPUESTO}`;
  if (!vieneDeOtraDireccion) return null;
  /* La ruta y los parámetros se **asignan** sobre el origen del sitio; no se
     pegan como texto. Pegados, una ruta que empieza con dos barras
     (`//otro.sitio/x`) se lee como otro servidor y la redirección salía del
     sitio. Asignada, queda como ruta de `mi-puesto.com`, que responde 404. */
  const destino = new URL(canonico.origin);
  destino.pathname = url.pathname;
  destino.search = url.search;
  return destino;
}
