import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  CABECERA_NONCE,
  crearNonce,
  politicaDeContenido,
} from "./lib/seguridad/politica-contenido";
import { actualizarSesionSupabase } from "./lib/supabase/proxy";

const RUTAS_AUTH = new Set(["/login", "/recuperar-clave", "/actualizar-clave"]);
const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "::1"]);

/* `/plataforma` entra acá aunque viva fuera de `/dashboard`: es la ruta más
   sensible del sistema y era la única cuya sesión no se renovaba, así que al
   administrador lo echaba al ingreso en medio del trabajo. */
export function requiereGestionDeSesion(ruta: string) {
  return (
    ruta === "/dashboard" ||
    ruta.startsWith("/dashboard/") ||
    /* El alta vive fuera de `/dashboard` para que no arrastre la navegación del
       panel, pero es igual de privada: sin esto, sus pantallas quedarían sin
       refresco de sesión y el dueño se encontraría deslogueado a mitad del
       recorrido. */
    ruta.startsWith("/alta/") ||
    ruta === "/plataforma" ||
    ruta.startsWith("/plataforma/") ||
    RUTAS_AUTH.has(ruta)
  );
}

function debeForzarHttps(solicitud: NextRequest) {
  return (
    process.env.NODE_ENV === "production" &&
    solicitud.nextUrl.protocol === "http:" &&
    !HOSTS_LOCALES.has(solicitud.nextUrl.hostname)
  );
}

export async function proxy(solicitud: NextRequest) {
  if (debeForzarHttps(solicitud)) {
    const destino = solicitud.nextUrl.clone();
    destino.protocol = "https:";
    return NextResponse.redirect(destino, 308);
  }

  /* Un nonce nuevo por solicitud. Va en la solicitud —de ahí lo toman vinext
     y React para sus scripts, y `components/marca/introduccion.tsx` para el
     suyo— y en la respuesta, que es la que el navegador hace cumplir. */
  const nonce = crearNonce();
  const politica = politicaDeContenido(nonce, process.env.NODE_ENV === "development");
  const cabecerasExtra = {
    "content-security-policy": politica,
    [CABECERA_NONCE]: nonce,
  };

  let respuesta: NextResponse;
  if (requiereGestionDeSesion(solicitud.nextUrl.pathname)) {
    respuesta = await actualizarSesionSupabase(solicitud, cabecerasExtra);
  } else {
    const cabeceras = new Headers(solicitud.headers);
    for (const [nombre, valor] of Object.entries(cabecerasExtra)) cabeceras.set(nombre, valor);
    respuesta = NextResponse.next({ request: { headers: cabeceras } });
  }
  respuesta.headers.set("Content-Security-Policy", politica);
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
