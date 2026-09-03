import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { obtenerVariablesPublicasSupabase } from "./variables";

export function crearClienteSupabaseAdmin() {
  const { url } = obtenerVariablesPublicasSupabase();
  const claveServicio =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!claveServicio) {
    throw new Error("Falta la clave privada de Supabase en el entorno del servidor.");
  }

  return createClient<Database>(url, claveServicio, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
