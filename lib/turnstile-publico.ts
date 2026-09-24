/* La clave del sitio de Cloudflare Turnstile. **Es pública por diseño**: el
   navegador la necesita para pedir la verificación, y sola no sirve para nada.
   La que no se muestra es la secreta, que vive en el Worker
   (`TURNSTILE_SECRET_KEY`).

   El widget se creó el 2026-09-24 en la cuenta de MiPuesto, en modo gestionado
   (invisible salvo que Cloudflare dude: ahí muestra una casilla),
   para `mipuesto-dev.mipuesto-app.workers.dev` y `localhost`. **Cuando se compre
   el dominio hay que sumarlo al widget** (panel de Cloudflare → Turnstile), o
   ningún pedido desde el dominio nuevo pasa la verificación. */
export const CLAVE_SITIO_TURNSTILE = "0x4AAAAAAFB658bsxsVBDF22";
