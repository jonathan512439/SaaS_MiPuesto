/* Cambiar la contraseña hablándole directamente a la API de autenticación.
 *
 * El camino del SDK falla en este punto y solo en este: `verifyOtp` responde
 * bien, y `updateUser` inmediatamente después devuelve 401 en el navegador. La
 * misma secuencia contra la API —canjear el enlace y usar el token devuelto en
 * la cabecera— se probó de punta a punta sobre un usuario descartable y
 * funciona: canje 200, cambio 200, ingreso con la nueva contraseña, correcto.
 *
 * La diferencia entre las dos es de dónde sale el token: el SDK lo busca donde
 * lo guardó, y acá se usa el que acaba de devolver el canje, sin pasar por
 * ningún almacenamiento. Se usa lo que está probado que anda.
 *
 * Queda anotado que **no sabemos por qué el SDK no lo encuentra**. Si más
 * adelante aparecen sesiones que se caen solas en el panel, este es el hilo.
 */
export type ResultadoCanje =
  | { correcto: true; accessToken: string; refreshToken: string; correo: string }
  | { correcto: false; motivo: string };

type RespuestaAuth = {
  access_token?: string;
  refresh_token?: string;
  user?: { email?: string };
  error_code?: string;
  msg?: string;
  message?: string;
  error_description?: string;
};

function motivoDe(datos: RespuestaAuth, estado: number): string {
  const detalle =
    datos.error_description ?? datos.msg ?? datos.message ?? datos.error_code ?? "";
  return detalle ? `${detalle} (${estado})` : `Error ${estado}`;
}

export async function canjearEnlace(
  url: string,
  clavePublica: string,
  tokenHash: string,
  tipo: string,
): Promise<ResultadoCanje> {
  const respuesta = await fetch(`${url}/auth/v1/verify`, {
    body: JSON.stringify({ token_hash: tokenHash, type: tipo }),
    headers: { apikey: clavePublica, "content-type": "application/json" },
    method: "POST",
  });
  const datos = (await respuesta.json().catch(() => ({}))) as RespuestaAuth;

  if (!respuesta.ok || !datos.access_token || !datos.refresh_token) {
    return { correcto: false, motivo: motivoDe(datos, respuesta.status) };
  }

  return {
    correcto: true,
    accessToken: datos.access_token,
    refreshToken: datos.refresh_token,
    /* El correo se rescata del canje para poder iniciar sesión con la contraseña
       recién puesta. Ver el comentario del formulario: la sesión del enlace no
       sirve para entrar al panel. */
    correo: datos.user?.email ?? "",
  };
}

export async function definirClaveConToken(
  url: string,
  clavePublica: string,
  accessToken: string,
  clave: string,
): Promise<{ correcto: boolean; motivo: string }> {
  const respuesta = await fetch(`${url}/auth/v1/user`, {
    body: JSON.stringify({ password: clave }),
    headers: {
      apikey: clavePublica,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    method: "PUT",
  });

  if (respuesta.ok) return { correcto: true, motivo: "" };

  const datos = (await respuesta.json().catch(() => ({}))) as RespuestaAuth;

  /* Los dos motivos que la persona puede resolver sola se traducen; el resto se
     muestra tal como vino, con su código. Un mensaje inventado ya nos costó
     tres días de buscar en el lugar equivocado. */
  if (datos.error_code === "same_password") {
    return { correcto: false, motivo: "Esa es la contraseña que ya tenías. Elige una distinta." };
  }
  if (datos.error_code === "weak_password") {
    return {
      correcto: false,
      motivo: "Esa contraseña es demasiado fácil de adivinar. Prueba con una o dos palabras más.",
    };
  }

  return { correcto: false, motivo: motivoDe(datos, respuesta.status) };
}

/* Una cuenta con segundo factor no puede cambiar su contraseña con la sesión
   que da el enlace del correo: Supabase exige `aal2` y el enlace entrega `aal1`.
   Responde 401 con «AAL2 session is required to update email or password when
   MFA is enabled».
 *
 * Es correcto que lo exija. Si bastara con el correo, quien tomara un buzón
 * podría saltarse el segundo factor entero, que es justamente lo que el segundo
 * factor viene a impedir. Lo que faltaba era pedir el código también acá.
 */
export function exigeSegundoFactor(motivo: string): boolean {
  return motivo.includes("AAL2") || motivo.includes("insufficient_aal");
}

export async function obtenerFactorVerificado(
  url: string,
  clavePublica: string,
  accessToken: string,
): Promise<string> {
  const respuesta = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: clavePublica, authorization: `Bearer ${accessToken}` },
  });
  if (!respuesta.ok) return "";
  const datos = (await respuesta.json().catch(() => ({}))) as {
    factors?: Array<{ id?: string; status?: string; factor_type?: string }>;
  };
  const factor = (datos.factors ?? []).find(
    (candidato) => candidato.factor_type === "totp" && candidato.status === "verified",
  );
  return factor?.id ?? "";
}

/* Devuelve el token elevado a `aal2`, o el motivo del fallo. */
export async function verificarSegundoFactor(
  url: string,
  clavePublica: string,
  accessToken: string,
  factorId: string,
  codigo: string,
): Promise<{ correcto: true; accessToken: string } | { correcto: false; motivo: string }> {
  const cabeceras = {
    apikey: clavePublica,
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
  };

  const desafio = await fetch(`${url}/auth/v1/factors/${factorId}/challenge`, {
    body: "{}",
    headers: cabeceras,
    method: "POST",
  });
  const datosDesafio = (await desafio.json().catch(() => ({}))) as RespuestaAuth & {
    id?: string;
  };
  if (!desafio.ok || !datosDesafio.id) {
    return { correcto: false, motivo: motivoDe(datosDesafio, desafio.status) };
  }

  const verificacion = await fetch(`${url}/auth/v1/factors/${factorId}/verify`, {
    body: JSON.stringify({ challenge_id: datosDesafio.id, code: codigo }),
    headers: cabeceras,
    method: "POST",
  });
  const datos = (await verificacion.json().catch(() => ({}))) as RespuestaAuth;

  if (!verificacion.ok || !datos.access_token) {
    /* El código equivocado es el caso normal, no una falla del sistema: se dice
       en palabras y se deja reintentar sin volver a empezar. */
    return {
      correcto: false,
      motivo:
        verificacion.status === 400 || verificacion.status === 422
          ? "El código no coincide. Prueba con el siguiente que muestre tu aplicación."
          : motivoDe(datos, verificacion.status),
    };
  }

  return { correcto: true, accessToken: datos.access_token };
}
