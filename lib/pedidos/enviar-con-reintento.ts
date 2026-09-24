/* Enviar un pedido o una reserva sin que un corte se lea como «falló».
 *
 * Pasó el 2026-09-24 con pedidos reales: el Worker se pasaba del límite de CPU
 * del plan gratuito —10 ms, y un pedido gasta entre 6 y 12— **después** de que
 * la base ya había creado el pedido. El navegador recibía una página de error
 * de Cloudflare en vez de la respuesta, el carrito decía «No se pudo reservar»
 * y el comprador volvía a pedir: un pedido fantasma y otro repetido.
 *
 * Un corte así no dice si el pedido se creó o no. Pero la base sí lo sabe: el
 * envío lleva un identificador (`idempotencia`), y si llega dos veces devuelve
 * el mismo pedido marcado como repetido, sin crear otro y sin contar para el
 * tope por IP. Así que ante un corte **se pregunta de nuevo**, con el mismo
 * identificador:
 *
 * - si el pedido se había creado, vuelve ese mismo y el comprador ve su código;
 * - si no se había creado, se crea ahora.
 *
 * Se reintenta ante lo que no es una respuesta de la aplicación: la red que se
 * cae, un error 5xx, un cuerpo que no es JSON (la página de error de
 * Cloudflare). También ante un 403 de la verificación: casi siempre es un token
 * vencido, y cada intento pide uno nuevo. **No** se reintenta un 4xx de la
 * aplicación —precio, stock, horario—: repetirlo daría la misma respuesta.
 *
 * `enviar` arma el envío entero cada vez, porque el token de verificación
 * sirve una sola vez; el identificador lo pone quien llama, y es el mismo.
 */

export const INTENTOS_MAXIMOS = 3;
export const ESPERA_ENTRE_INTENTOS_MS = 1_200;

export type ResultadoEnvio<T> =
  /* La aplicación contestó —bien o mal— con su JSON. */
  | { tipo: "respuesta"; estado: number; datos: T }
  /* Nunca llegó una respuesta legible: no se sabe si se creó. */
  | { tipo: "sin_respuesta"; motivo: string };

function reintentable(estado: number): boolean {
  return estado >= 500 || estado === 403;
}

export async function enviarConReintento<T>(
  enviar: () => Promise<Response>,
  esperar: (ms: number) => Promise<void> = (ms) => new Promise((listo) => setTimeout(listo, ms)),
): Promise<ResultadoEnvio<T>> {
  let ultimo: ResultadoEnvio<T> = { tipo: "sin_respuesta", motivo: "sin-intentos" };

  for (let intento = 1; intento <= INTENTOS_MAXIMOS; intento += 1) {
    if (intento > 1) await esperar(ESPERA_ENTRE_INTENTOS_MS * (intento - 1));

    let respuesta: Response;
    try {
      respuesta = await enviar();
    } catch {
      ultimo = { tipo: "sin_respuesta", motivo: "red" };
      continue;
    }

    let datos: T;
    try {
      datos = (await respuesta.json()) as T;
    } catch {
      ultimo = { tipo: "sin_respuesta", motivo: `cuerpo-ilegible-${respuesta.status}` };
      continue;
    }

    ultimo = { tipo: "respuesta", estado: respuesta.status, datos };
    if (!reintentable(respuesta.status)) return ultimo;
  }

  return ultimo;
}

/* Lo que se le dice a quien pidió cuando, después de los reintentos, no hubo
   una respuesta legible. No dice «falló»: no se sabe, y lo que tiene que saber
   es que volver a intentar no duplica nada. */
export const MENSAJE_SIN_RESPUESTA =
  "No pudimos confirmar tu pedido por un problema de conexión. Volvé a intentarlo: si ya se había reservado, verás el mismo código, sin duplicarlo.";

export const MENSAJE_SIN_RESPUESTA_TURNO =
  "No pudimos confirmar tu turno por un problema de conexión. Volvé a intentarlo: si ya se había apartado, verás el mismo, sin duplicarlo.";
