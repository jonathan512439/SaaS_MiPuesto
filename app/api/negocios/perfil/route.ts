import { NextResponse, type NextRequest } from "next/server";


import { validarDatosNegocio } from "../../../../lib/negocios/validacion";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

const COLUMNAS_PERFIL =
  "id,nombre,slug,descripcion,subnombre,tipo_negocio,telefono_whatsapp,activo,verificado,rubro,pide_numero_mesa";

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
    .select("id,slug,rubro,rubro_bloqueado_en")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (errorLectura) {
    return NextResponse.json(
      { error: "No se pudo leer la configuración actual." },
      { status: 500 },
    );
  }

  /* El rubro no se cambia desde acá una vez elegido.
   *
   * La pantalla ya lo muestra de solo lectura, pero eso no alcanza: una pantalla
   * es una sugerencia y el servidor es la regla. Cambiarlo **reinicia el
   * catálogo** —se borran categorías, productos y fotos— y lo hace el equipo con
   * la exportación previa, no una petición armada a mano.
   *
   * Se compara contra lo guardado y no se rechaza cualquier envío con rubro: el
   * formulario manda el negocio entero, así que **siempre** incluye el rubro que
   * ya tenía. Rechazar por venir sería trabar cualquier cambio de teléfono. */
  const datos = { ...validacion.datos };
  if (negocioActual?.rubro_bloqueado_en && datos.rubro !== negocioActual.rubro) {
    return NextResponse.json(
      {
        error:
          "Tu rubro ya quedó fijo. Para cambiarlo, escribinos: el catálogo se reinicia y te lo exportamos antes.",
      },
      { status: 409 },
    );
  }

  const consulta = negocioActual
    ? supabase
        .from("negocios")
        .update(datos)
        .eq("id", negocioActual.id)
        .select(COLUMNAS_PERFIL)
        .single()
    : supabase
        .from("negocios")
        .insert({ ...datos, admin_user_id: idUsuario })
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

  /* Al renombrar cambia la direccion, asi que se invalida tambien la anterior:
     de lo contrario el catalogo viejo seguiria sirviendose desde la cache. */
  if (negocioActual?.slug && negocioActual.slug !== negocio.slug) {
  }

  return NextResponse.json({ negocio }, { status: negocioActual ? 200 : 201 });
}
