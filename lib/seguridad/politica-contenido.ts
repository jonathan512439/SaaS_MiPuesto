/* La política de contenido (CSP) del sitio, con un nonce por solicitud.
 *
 * Hasta el 2026-09-24 `script-src` llevaba `'unsafe-inline'` sin más: cualquier
 * `<script>` que lograra colarse en una página corría. Ahora cada página lleva
 * un nonce nuevo, y solo corren los scripts en línea que lo tienen —los de
 * vinext y React, que lo toman de la cabecera de la solicitud, y el guion de la
 * introducción—.
 *
 * `'unsafe-inline'` sigue escrito **a propósito**: un navegador que entiende
 * nonces lo ignora en cuanto ve uno (CSP nivel 2), y uno viejo que no los
 * entiende sigue funcionando en vez de quedarse sin catálogo.
 *
 * El nonce obliga a dibujar cada página en cada visita. Acá eso no cuesta nada:
 * ninguna página se guarda en caché —todas salen con `no-store`—.
 *
 * `style-src` queda como estaba. Un nonce ahí haría ignorar `'unsafe-inline'`
 * también para estilos, y React escribe estilos en línea en los elementos.
 *
 * La arma `proxy.ts` en cada solicitud. */

export const CABECERA_NONCE = "x-nonce";

export function crearNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function politicaDeContenido(nonce: string, desarrollo: boolean): string {
  return [
    "default-src 'self'",
    /* Cloudflare Turnstile: su script y el marco donde verifica, al enviar un
       pedido o una reserva. `lib/turnstile-cliente.ts`. */
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://challenges.cloudflare.com${desarrollo ? " 'unsafe-eval'" : ""}`,
    "frame-src https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    /* Los mosaicos del mapa de la fase 11. Se ven solo en el alta y en «Mi
       negocio», pero la política es una sola para todo el sitio. Si se cambia
       de proveedor, cambia acá y en `MOSAICOS_MAPA`. */
    "img-src 'self' data: blob: https://*.supabase.co https://tile.openstreetmap.org",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "media-src 'self' https://*.supabase.co",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
