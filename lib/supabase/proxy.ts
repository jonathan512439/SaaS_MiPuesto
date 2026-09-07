import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { esSesionDeRecuperacion } from "../auth/sesion-recuperacion";
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

  const enRecuperacion = esSesionDeRecuperacion(claims);

  /* Quien viene del enlace del correo todavía no definió su contraseña. Puede
     hacer una sola cosa: definirla. Antes caía en el panel y salía de ahí
     creyendo que ya la había cambiado. */
  if (enRecuperacion && (ruta === "/dashboard" || ruta.startsWith("/dashboard/"))) {
    const destino = solicitud.nextUrl.clone();
    destino.pathname = "/actualizar-clave";
    destino.search = "";
    destino.searchParams.set("motivo", "pendiente");
    return NextResponse.redirect(destino);
  }

  if (!claims && ruta.startsWith("/dashboard")) {
    const destino = solicitud.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    destino.searchParams.set("motivo", "sesion");
    return NextResponse.redirect(destino);
  }

  /* La comodidad de «ya estás dentro, te llevo al panel» no aplica a una sesión
     de recuperación: era el atajo por el que un enlace de correo terminaba
     abriendo la aplicación sin haber cambiado nada. */
  if (claims && !enRecuperacion && (ruta === "/login" || ruta === "/recuperar-clave")) {
    const destino = solicitud.nextUrl.clone();
    destino.pathname = "/dashboard/configuracion";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return respuesta;
}
