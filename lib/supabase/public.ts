import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { obtenerVariablesPublicasSupabase } from "./variables";

export function crearClienteSupabasePublico() {
  const { url, clavePublica } = obtenerVariablesPublicasSupabase();
  return createClient<Database>(url, clavePublica, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
