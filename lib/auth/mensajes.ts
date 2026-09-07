type ErrorAuth = {
  code?: string;
  status?: number;
};

export function mensajeErrorInicioSesion(error: ErrorAuth) {
  if (error.code === "email_not_confirmed") {
    return "Confirmá tu correo antes de ingresar. Revisá también la carpeta de correo no deseado.";
  }

  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "Se hicieron demasiados intentos. Esperá unos minutos antes de volver a probar.";
  }

  return "El correo o la contraseña no son correctos. Revisalos y volvé a intentar.";
}

/* Antes cualquier fallo decía «el enlace no es válido», incluso cuando el enlace
   estaba perfecto y el problema era otro: repetir la contraseña anterior, elegir
   una débil, o quedarse sin conexión. Mandaba a pedir un enlace nuevo, que
   fallaba igual, y de paso hacía creer que el sistema estaba roto. */
export function mensajeErrorActualizarClave(error: ErrorAuth) {
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "Se hicieron demasiados intentos. Esperá unos minutos antes de volver a probar.";
  }

  if (error.code === "same_password") {
    return "Esa es la contraseña que ya tenías. Elegí una distinta.";
  }

  if (error.code === "weak_password") {
    return "Esa contraseña es demasiado fácil de adivinar. Probá con uno o dos palabras más.";
  }

  /* Sin sesión sí es el enlace: venció, ya se usó, o se abrió en un navegador
     distinto del que lo pidió, que es el caso más común y el menos evidente. */
  if (error.code === "session_not_found" || error.status === 401 || error.status === 403) {
    return "El enlace ya no sirve: venció, ya se usó, o lo abriste en otro navegador. Pedí uno nuevo y abrilo en el mismo teléfono donde lo solicitaste.";
  }

  return "No pudimos guardar la contraseña. Volvé a intentar en un momento.";
}
