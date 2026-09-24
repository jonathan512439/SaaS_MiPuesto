/* Supabase limita cuántos correos manda: uno por dirección cada pocos segundos,
   y un tope por hora en todo el proyecto. Cuando se pasa, responde 429 y **no
   envía nada**.
 *
 * El formulario ignoraba la respuesta y siempre decía «revisa tu correo». Eso es
 * correcto para no revelar si una dirección existe —esa es una decisión de
 * privacidad y se mantiene—, pero un 429 no tiene nada que ver con la
 * privacidad: es una espera. Callarlo deja a la persona mirando una bandeja
 * vacía sin saber que el sistema decidió no mandar nada.
 *
 * Nos cost\u00f3 una tarde de buscar el fallo en el servidor de correo cuando el
 * sistema ya lo estaba diciendo en la respuesta.
 */
type ErrorEnvio = { status?: number; code?: string; message?: string };

export function esLimiteDeCorreo(error: ErrorEnvio | null): boolean {
  if (!error) return false;
  return error.status === 429 || error.code === "over_email_send_rate_limit";
}

/* Supabase escribe los segundos dentro del mensaje: «you can only request this
   after 22 seconds». Se rescatan para poder decir cuánto falta en vez de un
   «espera un rato» que no ayuda a decidir si conviene esperar o no. */
export function segundosDeEspera(error: ErrorEnvio | null): number {
  const encontrado = /after (\d+) seconds?/.exec(error?.message ?? "");
  return encontrado ? Number(encontrado[1]) : 0;
}

export function mensajeDeEspera(error: ErrorEnvio | null): string {
  const segundos = segundosDeEspera(error);
  if (segundos > 0) {
    return `Ya pediste uno hace poco. Espera ${segundos} segundos y vuelve a intentar.`;
  }
  return "Se pidieron demasiados correos en poco tiempo. Espera unos minutos y vuelve a intentar.";
}
