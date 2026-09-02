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

export function mensajeErrorActualizarClave(error: ErrorAuth) {
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "Se hicieron demasiados intentos. Esperá unos minutos antes de volver a probar.";
  }

  return "El enlace ya no es válido o venció. Solicitá uno nuevo desde Recuperar contraseña.";
}
