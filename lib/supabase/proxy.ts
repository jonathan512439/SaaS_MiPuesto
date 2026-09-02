import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";
import { obtenerVariablesPublicasSupabase } from "./variables";

export async function actualizarSesionSupabase(solicitud: NextRequest) {
  let respuesta = NextResponse.next({ request: solicitud });
  const { url, clavePublica } = obtenerVariablesPublicasSupabase();

  const supabase = createServerClient<Database>(url, clavePublica, {
    cookies: {
      getAll() {
        return solicitud.cookies.getAll();
      },
      setAll(cookiesParaGuardar) {
        cookiesParaGuardar.forEach(({ name, value }) => {
          solicitud.cookies.set(name, value);
        });

        respuesta = NextResponse.next({ request: solicitud });

        cookiesParaGuardar.forEach(({ name, value, options }) => {
          respuesta.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: datosClaims } = await supabase.auth.getClaims();
  const claims = datosClaims?.claims;
  const ruta = solicitud.nextUrl.pathname;

  if (!claims && ruta.startsWith("/dashboard")) {
    const destino = solicitud.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    destino.searchParams.set("motivo", "sesion");
    return NextResponse.redirect(destino);
  }

  if (claims && (ruta === "/login" || ruta === "/recuperar-clave")) {
    const destino = solicitud.nextUrl.clone();
    destino.pathname = "/dashboard/configuracion";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return respuesta;
}
