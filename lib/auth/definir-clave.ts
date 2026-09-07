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
  | { correcto: true; accessToken: string; refreshToken: string }
  | { correcto: false; motivo: string };

type RespuestaAuth = {
  access_token?: string;
  refresh_token?: string;
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
    return { correcto: false, motivo: "Esa es la contraseña que ya tenías. Elegí una distinta." };
  }
  if (datos.error_code === "weak_password") {
    return {
      correcto: false,
      motivo: "Esa contraseña es demasiado fácil de adivinar. Probá con una o dos palabras más.",
    };
  }

  return { correcto: false, motivo: motivoDe(datos, respuesta.status) };
}
