import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { esSesionDeRecuperacion } from "../auth/sesion-recuperacion";
import type { Database } from "./database.types";
import { obtenerVariablesPublicasSupabase } from "./variables";
import { RUTAS_PANEL } from "../panel/rutas";

/* `cabecerasExtra`: lo que el proxy le agrega a la solicitud antes de pasarla
   a la página —la política de contenido con su nonce—. Se suman a las de la
   solicitud **cada vez** que se arma la respuesta, porque `setAll` la vuelve a
   armar después de renovar las cookies y la solicitud ya trae las nuevas. */
export async function actualizarSesionSupabase(
  solicitud: NextRequest,
  cabecerasExtra: Record<string, string> = {},
) {
  function continuar() {
    const cabeceras = new Headers(solicitud.headers);
    for (const [nombre, valor] of Object.entries(cabecerasExtra)) cabeceras.set(nombre, valor);
    return NextResponse.next({ request: { headers: cabeceras } });
  }

  let respuesta = continuar();
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

        respuesta = continuar();

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
  if (enRecuperacion && (ruta === RUTAS_PANEL.inicio || ruta.startsWith("/dashboard/"))) {
    const destino = solicitud.nextUrl.clone();
    destino.pathname = "/actualizar-clave";
    destino.search = "";
    destino.searchParams.set("motivo", "pendiente");
    return NextResponse.redirect(destino);
  }

  if (!claims && ruta.startsWith(RUTAS_PANEL.inicio)) {
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
    destino.pathname = RUTAS_PANEL.negocio;
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return respuesta;
}
