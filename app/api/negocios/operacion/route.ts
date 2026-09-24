import { NextResponse, type NextRequest } from "next/server";


import { validarOperacionNegocio } from "../../../../lib/negocios/operacion";
import type { Json } from "../../../../lib/supabase/database.types";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

export async function POST(solicitud: NextRequest) {
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

  const validacion = validarOperacionNegocio(entrada);
  if (!validacion.correcto) {
    return NextResponse.json(
      { error: "Revisa el horario, el tiempo de reserva y el tope de unidades.", errores: validacion.errores },
      { status: 400 },
    );
  }

  const { data: negocio, error } = await supabase
    .from("negocios")
    .update({
      horario: validacion.datos.horario as unknown as Json,
      reserva_minutos: validacion.datos.reserva_minutos,
      tope_unidades_pedido: validacion.datos.tope_unidades_pedido,
    })
    .eq("admin_user_id", idUsuario)
    .select("slug,horario,reserva_minutos,tope_unidades_pedido")
    .maybeSingle();

  if (error || !negocio) {
    return NextResponse.json(
      { error: "No se pudo guardar la atención del negocio." },
      { status: 500 },
    );
  }


  return NextResponse.json({ negocio });
}
