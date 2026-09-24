/* Que un pedido o una reserva lo haga una persona y no un programa.
 *
 * El tope por IP —cinco en quince minutos por negocio— frena a quien insiste
 * desde un solo lugar, pero no a un programa que cambia de IP: ese podía
 * apartar todas las existencias de una tienda chica, o todos los turnos de una
 * agenda, sin comprar nada, y volver a hacerlo cada vez que vencen. Cloudflare
 * Turnstile, invisible, lo verifica sin pedirle nada a la persona.
 *
 * **Cuándo se rechaza y cuándo no:**
 * - Sin token, o con uno que Cloudflare dice que no vale (inventado, vencido o
 *   ya usado): se rechaza. Es lo que haría un programa.
 * - Si Cloudflare no contesta —caído, lento—: **se deja pasar** y se anota. Un
 *   problema de un tercero no puede dejar sin ventas a todos los negocios a la
 *   vez; el tope por IP sigue funcionando mientras tanto.
 *
 * Cada token sirve una sola vez: el navegador pide uno nuevo en cada envío.
 */

const URL_VERIFICACION = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const ESPERA_MAXIMA_MS = 5_000;
const LARGO_MAXIMO_TOKEN = 2_048;

export type ResultadoVerificacion =
  | { permitido: true; verificado: boolean }
  | { permitido: false; motivo: string };

/* Lo que ve quien pidió si la verificación falla. No dice «sos un robot»: la
   causa más común es un token que venció porque la página quedó abierta. */
export const MENSAJE_VERIFICACION_FALLIDA =
  "No pudimos comprobar el envío. Vuelve a intentarlo; si sigue pasando, recarga la página.";

/* Cómo se aplica: `exigir` rechaza lo que no pasa; `observar` verifica y anota,
   pero deja pasar. Se arrancó observando porque el camino de una persona real
   no se puede probar con un navegador automatizado —Turnstile lo reconoce y no
   le da token, que es justamente su trabajo— y un error ahí dejaría a todos los
   negocios sin pedidos. Con el registro del Worker mostrando envíos reales
   verificados, se pasa a `exigir` con
   `wrangler secret put TURNSTILE_MODO` sin volver a publicar. Sin la variable,
   se exige: el modo seguro es el que no necesita que alguien se acuerde. */
export type ModoTurnstile = "exigir" | "observar";

export function leerModoTurnstile(): ModoTurnstile {
  return process.env.TURNSTILE_MODO?.trim() === "observar" ? "observar" : "exigir";
}

/* La decisión final, con lo que se anota. `donde` es «pedido» o «reserva». */
export function decidirConTurnstile(
  resultado: ResultadoVerificacion,
  modo: ModoTurnstile,
  donde: string,
): boolean {
  if (modo === "exigir") return resultado.permitido;
  console.log(
    resultado.permitido
      ? `Turnstile observando (${donde}): ${resultado.verificado ? "verificado" : "sin verificar, Cloudflare no contestó"}.`
      : `Turnstile observando (${donde}): se habría rechazado (${resultado.motivo}).`,
  );
  return true;
}

export function leerSecretoTurnstile(): string {
  const secreto = process.env.TURNSTILE_SECRET_KEY ?? "";
  if (secreto.length < 20) throw new Error("Falta TURNSTILE_SECRET_KEY.");
  return secreto;
}

export async function verificarTurnstile(
  token: unknown,
  ip: string,
  secreto: string,
  pedir: typeof fetch = fetch,
): Promise<ResultadoVerificacion> {
  if (typeof token !== "string" || token.trim() === "" || token.length > LARGO_MAXIMO_TOKEN) {
    return { permitido: false, motivo: "sin-token" };
  }

  const cuerpo = new URLSearchParams({ secret: secreto, response: token });
  /* La IP ayuda a Cloudflare a decidir, pero en desarrollo no hay una real. */
  if (ip && ip !== "entorno-local") cuerpo.set("remoteip", ip);

  let respuesta: Response;
  try {
    respuesta = await pedir(URL_VERIFICACION, {
      method: "POST",
      body: cuerpo,
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
  } catch {
    console.warn("Turnstile no contestó: se dejó pasar el envío con el tope por IP.");
    return { permitido: true, verificado: false };
  }

  if (!respuesta.ok) {
    console.warn(`Turnstile respondió ${respuesta.status}: se dejó pasar el envío con el tope por IP.`);
    return { permitido: true, verificado: false };
  }

  const datos = (await respuesta.json().catch(() => null)) as {
    success?: boolean;
    "error-codes"?: string[];
  } | null;
  if (!datos) {
    console.warn("Turnstile respondió algo ilegible: se dejó pasar el envío con el tope por IP.");
    return { permitido: true, verificado: false };
  }

  if (datos.success === true) return { permitido: true, verificado: true };

  /* Un secreto mal cargado es un error nuestro, no del que pide: se anota
     fuerte, pero se rechaza igual, porque dejar pasar todo sin verificar
     durante días sería no tener verificación. */
  const codigos = datos["error-codes"] ?? [];
  if (codigos.includes("invalid-input-secret") || codigos.includes("missing-input-secret")) {
    console.error("Turnstile rechazó la clave secreta: revisa TURNSTILE_SECRET_KEY.");
  }
  return { permitido: false, motivo: codigos.join(",") || "rechazado" };
}
