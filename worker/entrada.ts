import vinext from "vinext/server/fetch-handler";

import { conCacheDePortada } from "../lib/catalogo/cache-portada";
import { entregarArchivo, tutorialPedido } from "../lib/tutoriales/archivos";
import { baldeTutoriales, largoFijo } from "../lib/tutoriales/balde";

/* La entrada del Worker: los videos de los tutoriales salen directo de R2, y
 * todo lo demás va a vinext, que es lo de siempre.
 *
 * Existe por un solo motivo. vinext envuelve el cuerpo de la respuesta de cada
 * ruta en un flujo propio, y en ese paso el video perdía su `Content-Length`
 * —salía en trozos aunque la cabecera estuviera puesta, aun con
 * `FixedLengthStream`—. Sin largo, la caché que va delante del Worker no sabe
 * entregar partes: devolvía el video entero a cada pedido, el navegador no
 * podía soltar los que quedaban en pausa y, con tres o cuatro abiertos, el
 * siguiente se quedaba cargando (2026-10-28).
 *
 * Atendido acá, la respuesta es la que arma `entregarArchivo`, con su largo. La
 * ruta `app/api/tutoriales/[nombre]` queda para el servidor de desarrollo, que
 * no pasa por esta entrada.
 *
 * Lo que no se salta: los videos no llevan sesión ni cookies, y la política de
 * contenido del proxy no aplica a un archivo de video (va con `nosniff`). */
const entrada = {
  async fetch(solicitud: Request, env: unknown, ctx: unknown): Promise<Response> {
    const nombre = tutorialPedido(solicitud);
    const balde = nombre ? baldeTutoriales() : null;
    if (nombre && balde) {
      try {
        return await entregarArchivo(balde, nombre, solicitud, largoFijo);
      } catch {
        /* R2 caído o un error al leer: lo mismo que respondía vinext, sin
           que quede guardado en la caché. */
        return new Response("No se pudo leer el archivo del tutorial.", {
          status: 500,
          headers: { "Cache-Control": "no-store" },
        });
      }
    }
    /* La portada de cada catálogo, guardada un minuto: con el plan gratuito de
       Workers, armarla en cada visita la dejaba en 503 (lib/catalogo/cache-portada.ts). */
    return conCacheDePortada(solicitud, await vinext.fetch(solicitud, env, ctx));
  },
};

export default entrada;
