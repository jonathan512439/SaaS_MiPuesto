import { NextResponse, type NextRequest } from "next/server";

import { validarDatosNegocio } from "../../../../lib/negocios/validacion";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

const COLUMNAS_PERFIL =
  "id,nombre,slug,descripcion,tipo_negocio,telefono_whatsapp,activo,verificado";

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

  const validacion = validarDatosNegocio(entrada);
  if (!validacion.correcto) {
    return NextResponse.json(
      { error: "Revisá los campos marcados.", errores: validacion.errores },
      { status: 400 },
    );
  }

  const { data: slugDisponible, error: errorDisponibilidad } = await supabase.rpc(
    "slug_disponible",
    { p_slug: validacion.datos.slug },
  );

  if (errorDisponibilidad) {
    return NextResponse.json(
      { error: "No se pudo comprobar la dirección del catálogo." },
      { status: 500 },
    );
  }

  if (!slugDisponible) {
    return NextResponse.json(
      {
        error: "La dirección del catálogo ya está ocupada.",
        errores: { slug: "Ese nombre ya está en uso. Elegí otro." },
      },
      { status: 409 },
    );
  }

  const { data: negocioActual, error: errorLectura } = await supabase
    .from("negocios")
    .select("id")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (errorLectura) {
    return NextResponse.json(
      { error: "No se pudo leer la configuración actual." },
      { status: 500 },
    );
  }

  const consulta = negocioActual
    ? supabase
        .from("negocios")
        .update(validacion.datos)
        .eq("id", negocioActual.id)
        .select(COLUMNAS_PERFIL)
        .single()
    : supabase
        .from("negocios")
        .insert({ ...validacion.datos, admin_user_id: idUsuario })
        .select(COLUMNAS_PERFIL)
        .single();

  const { data: negocio, error: errorGuardado } = await consulta;

  if (errorGuardado?.code === "23505") {
    return NextResponse.json(
      { error: "El negocio o su dirección ya fueron registrados." },
      { status: 409 },
    );
  }

  if (errorGuardado || !negocio) {
    return NextResponse.json(
      { error: "No se pudo guardar el negocio. Probá nuevamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ negocio }, { status: negocioActual ? 200 : 201 });
}
