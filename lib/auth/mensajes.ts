type ErrorAuth = {
  code?: string;
  status?: number;
};

export function mensajeErrorInicioSesion(error: ErrorAuth) {
  if (error.code === "email_not_confirmed") {
    return "Confirma tu correo antes de ingresar. Revisa también la carpeta de correo no deseado.";
  }

  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "Se hicieron demasiados intentos. Espera unos minutos antes de volver a probar.";
  }

  return "El correo o la contraseña no son correctos. Revísalos y vuelve a intentar.";
}

/* Antes cualquier fallo decía «el enlace no es válido», incluso cuando el enlace
   estaba perfecto y el problema era otro: repetir la contraseña anterior, elegir
   una débil, o quedarse sin conexión. Mandaba a pedir un enlace nuevo, que
   fallaba igual, y de paso hacía creer que el sistema estaba roto. */
export function mensajeErrorActualizarClave(error: ErrorAuth) {
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "Se hicieron demasiados intentos. Espera unos minutos antes de volver a probar.";
  }

  if (error.code === "same_password") {
    return "Esa es la contraseña que ya tenías. Elige una distinta.";
  }

  if (error.code === "weak_password") {
    return "Esa contraseña es demasiado fácil de adivinar. Prueba con uno o dos palabras más.";
  }

  /* Sin sesión sí es el enlace: venció, ya se usó, o se abrió en un navegador
     distinto del que lo pidió, que es el caso más común y el menos evidente. */
  /* Antes acá decía «el enlace venció o lo abriste en otro navegador». Cuando el
     enlace ya se había verificado bien, esas dos explicaciones eran falsas y
     mandaban a pedir otro enlace que fallaba igual. Lo que pasó de verdad es que
     la sesión no llegó al momento de guardar. */
  if (error.code === "session_not_found" || error.status === 401 || error.status === 403) {
    return "Tu sesión no llegó al momento de guardar. Si tu navegador bloquea cookies o estás en modo incógnito, prueba en una ventana normal.";
  }

  return "No pudimos guardar la contraseña. Vuelve a intentar en un momento.";
}
