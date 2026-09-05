import { NextResponse, type NextRequest } from "next/server";


import { esPaletaId, esPlantillaId } from "../../../../lib/plantillas/validacion";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

export async function PATCH(solicitud: NextRequest) {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;

  if (!idUsuario) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  let entrada: unknown;
  try {
    entrada = await solicitud.json();
  } catch {
    return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
  }

  const plantillaId =
    typeof entrada === "object" && entrada !== null && "plantilla_id" in entrada
      ? entrada.plantilla_id
      : undefined;
  const paletaId =
    typeof entrada === "object" && entrada !== null && "paleta_id" in entrada
      ? entrada.paleta_id
      : undefined;

  if (!esPlantillaId(plantillaId) || !esPaletaId(paletaId)) {
    return NextResponse.json(
      { error: "La plantilla o la paleta seleccionada no es válida." },
      { status: 400 },
    );
  }

  const { data: negocio, error } = await supabase
    .from("negocios")
    .update({ plantilla_id: plantillaId, paleta_id: paletaId })
    .eq("admin_user_id", idUsuario)
    .select("slug,plantilla_id,paleta_id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "No se pudo guardar la apariencia. Intenta nuevamente." },
      { status: 500 },
    );
  }

  if (!negocio) {
    return NextResponse.json({ error: "Primero debes registrar tu negocio." }, { status: 404 });
  }


  return NextResponse.json({
    plantilla_id: negocio.plantilla_id,
    paleta_id: negocio.paleta_id,
  });
}
