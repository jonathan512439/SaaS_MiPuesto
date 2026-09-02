import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

export type CredencialesPublicasSupabase = {
  url: string;
  clavePublica: string;
};

export function crearClienteSupabaseNavegador({
  url,
  clavePublica,
}: CredencialesPublicasSupabase) {
  return createBrowserClient<Database>(url, clavePublica);
}
