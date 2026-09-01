import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { obtenerVariablesPublicasSupabase } from "./variables";

export async function crearClienteSupabaseServidor() {
  const almacenCookies = await cookies();
  const { url, clavePublica } = obtenerVariablesPublicasSupabase();

  return createServerClient(url, clavePublica, {
    cookies: {
      getAll() {
        return almacenCookies.getAll();
      },
      setAll(cookiesParaGuardar) {
        try {
          cookiesParaGuardar.forEach(({ name, value, options }) => {
            almacenCookies.set(name, value, options);
          });
        } catch {
          // La renovación de sesión se incorporará con el proxy de la Fase 2.
        }
      },
    },
  });
}
