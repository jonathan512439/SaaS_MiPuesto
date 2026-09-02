import { NextResponse, type NextRequest } from "next/server";

import { normalizarSlug, validarSlug } from "../../../../lib/negocios/validacion";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

export async function GET(solicitud: NextRequest) {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();

  if (!datosClaims?.claims.sub) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  const slug = normalizarSlug(solicitud.nextUrl.searchParams.get("slug"));
  const errorFormato = validarSlug(slug);

  if (errorFormato) {
    return NextResponse.json(
      { disponible: false, error: errorFormato },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data: disponible, error } = await supabase.rpc("slug_disponible", {
    p_slug: slug,
  });

  if (error) {
    return NextResponse.json(
      { error: "No se pudo verificar el nombre en este momento." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { disponible: disponible === true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
