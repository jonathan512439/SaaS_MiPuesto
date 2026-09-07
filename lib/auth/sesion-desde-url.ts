/* El enlace del correo trae la sesión en la dirección, y el cliente del
   navegador la estaba rechazando.
 *
 * `createBrowserClient` de `@supabase/ssr` fija `flowType: "pkce"` a mano, sin
 * dejar cambiarlo. Y dentro de auth-js hay esta comprobación:
 *
 *     case "implicit":
 *       if (this.flowType === "pkce") throw new Error("Not a valid PKCE flow url");
 *
 * Un enlace de recuperación que llega como `#access_token=...` es exactamente
 * ese caso: el cliente lo ve, decide que no corresponde a su flujo y lo tira.
 * Nunca se abre la sesión, `updateUser` falla, y el mensaje culpaba al enlace
 * —que estaba perfecto—.
 *
 * Acá se toma la sesión a mano, aceptando las dos formas en que Supabase puede
 * mandarla, sin depender de qué flujo cree el cliente que está usando.
 */
export type TokensDeUrl =
  | { tipo: "implicito"; accessToken: string; refreshToken: string }
  | { tipo: "codigo"; codigo: string }
  | { tipo: "hash"; tokenHash: string; verificacion: string }
  | { tipo: "error"; mensaje: string; codigo: string }
  | { tipo: "ninguno" };

export function leerTokensDeUrl(href: string): TokensDeUrl {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { tipo: "ninguno" };
  }

  const desdeHash = new URLSearchParams(
    url.hash.startsWith("#") ? url.hash.slice(1) : url.hash,
  );

  /* El error puede venir en el fragmento o en la consulta según el caso. Se
     mira en los dos antes que los tokens: si Supabase mandó un error, no hay
     sesión que rescatar y el motivo real está ahí. */
  const descripcion =
    desdeHash.get("error_description") ?? url.searchParams.get("error_description");
  const codigoError = desdeHash.get("error_code") ?? url.searchParams.get("error_code");
  if (descripcion || codigoError) {
    return {
      tipo: "error",
      mensaje: descripcion ?? "",
      codigo: codigoError ?? desdeHash.get("error") ?? url.searchParams.get("error") ?? "",
    };
  }

  const accessToken = desdeHash.get("access_token");
  const refreshToken = desdeHash.get("refresh_token");
  if (accessToken && refreshToken) {
    return { tipo: "implicito", accessToken, refreshToken };
  }

  const codigo = url.searchParams.get("code");
  if (codigo) return { tipo: "codigo", codigo };

  /* La forma que usa la plantilla de correo cuando se la configura con
     `{{ .TokenHash }}`. Es la única que **no se consume al abrirse**: se
     verifica cuando la persona toca el botón, así que un antivirus de correo o
     una vista previa que visiten el enlace no lo queman. */
  const tokenHash = url.searchParams.get("token_hash");
  const verificacion = url.searchParams.get("type");
  if (tokenHash && verificacion) return { tipo: "hash", tokenHash, verificacion };

  return { tipo: "ninguno" };
}

/* Los tokens no deben quedar en la barra de direcciones ni en el historial:
   cualquiera que abra el historial del teléfono los tendría. */
export function limpiarUrl(href: string): string {
  try {
    const url = new URL(href);
    url.hash = "";
    url.searchParams.delete("code");
    url.searchParams.delete("token_hash");
    url.searchParams.delete("type");
    return `${url.pathname}${url.search}`;
  } catch {
    return "/actualizar-clave";
  }
}
