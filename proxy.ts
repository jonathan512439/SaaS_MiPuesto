import type { NextRequest } from "next/server";

import { actualizarSesionSupabase } from "./lib/supabase/proxy";

export async function proxy(solicitud: NextRequest) {
  return actualizarSesionSupabase(solicitud);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/recuperar-clave",
    "/actualizar-clave",
  ],
};
