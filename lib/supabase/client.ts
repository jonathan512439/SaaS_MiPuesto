import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { obtenerVariablesPublicasSupabase } from "./variables";

export function crearClienteSupabaseNavegador() {
  const { url, clavePublica } = obtenerVariablesPublicasSupabase();
  return createBrowserClient<Database>(url, clavePublica);
}
