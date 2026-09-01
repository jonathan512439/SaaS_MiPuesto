import { createBrowserClient } from "@supabase/ssr";

import { obtenerVariablesPublicasSupabase } from "./variables";

export function crearClienteSupabaseNavegador() {
  const { url, clavePublica } = obtenerVariablesPublicasSupabase();
  return createBrowserClient(url, clavePublica);
}

