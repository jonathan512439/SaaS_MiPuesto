type VariablesPublicasSupabase = {
  url: string;
  clavePublica: string;
};

export function obtenerVariablesPublicasSupabase(): VariablesPublicasSupabase {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clavePublica =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !clavePublica) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y la clave pública de Supabase.",
    );
  }

  return { url, clavePublica };
}
