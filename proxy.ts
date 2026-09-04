import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { actualizarSesionSupabase } from "./lib/supabase/proxy";

const RUTAS_AUTH = new Set(["/login", "/recuperar-clave", "/actualizar-clave"]);
const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "::1"]);

function requiereGestionDeSesion(ruta: string) {
  return ruta === "/dashboard" || ruta.startsWith("/dashboard/") || RUTAS_AUTH.has(ruta);
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

  if (requiereGestionDeSesion(solicitud.nextUrl.pathname)) {
    return actualizarSesionSupabase(solicitud);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
