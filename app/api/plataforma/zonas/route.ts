import { NextResponse, type NextRequest } from "next/server";

import { esUuid } from "../../../../lib/catalogo/validacion";
import { estaEnBolivia, redondearPunto } from "../../../../lib/negocios/coordenadas";
import { esCiudadId } from "../../../../lib/negocios/lugares";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

/* Las zonas de cada ciudad, desde la plataforma. Fase 11.
 *
 * Crear, renombrar, mover el punto central, darla de baja, y asignar una zona
 * a un negocio que escribió «Mi zona no está». Todo con la sesión del
 * administrador: la política de la tabla y la función de asignar exigen ser
 * administrador de la plataforma **dentro de Postgres**, así que esta ruta no
 * decide quién puede; si alguien sin permiso llega hasta acá, la base lo frena.
 */

type Entrada = Record<string, unknown>;

function leerZona(entrada: Entrada) {
  const errores: Record<string, string> = {};
  const nombre = typeof entrada.nombre === "string" ? entrada.nombre.trim() : "";
  if (nombre.length < 2 || nombre.length > 60) errores.nombre = "El nombre va de 2 a 60 caracteres.";
  if (!esCiudadId(entrada.ciudad)) errores.ciudad = "Elegí la ciudad.";
  const lat = Number(entrada.latitud);
  const lng = Number(entrada.longitud);
  if (!estaEnBolivia({ lat, lng })) errores.punto = "Marcá el centro de la zona en el mapa.";
  const punto = redondearPunto({ lat, lng });
  return { errores, fila: { nombre, ciudad: String(entrada.ciudad), latitud: punto.lat, longitud: punto.lng } };
}

async function sesion() {
  const supabase = await crearClienteSupabaseServidor();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ? supabase : null;
}

async function leerEntrada(solicitud: NextRequest): Promise<Entrada | null> {
  try {
    const datos = (await solicitud.json()) as unknown;
    return typeof datos === "object" && datos !== null ? (datos as Entrada) : null;
  } catch {
    return null;
  }
}

export async function POST(solicitud: NextRequest) {
  const supabase = await sesion();
  if (!supabase) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const entrada = await leerEntrada(solicitud);
  if (!entrada) return NextResponse.json({ error: "Los datos no son válidos." }, { status: 400 });

  const { errores, fila } = leerZona(entrada);
  if (Object.keys(errores).length > 0) {
    return NextResponse.json({ error: "Revisá la zona.", errores }, { status: 400 });
  }

  const { data, error } = await supabase.from("zonas").insert(fila).select("id").maybeSingle();
  if (error?.code === "23505") {
    return NextResponse.json({ error: "Esa zona ya existe en esa ciudad." }, { status: 409 });
  }
  if (error || !data) {
    return NextResponse.json({ error: "No se pudo crear la zona." }, { status: 403 });
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function PATCH(solicitud: NextRequest) {
  const supabase = await sesion();
  if (!supabase) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const entrada = await leerEntrada(solicitud);
  if (!entrada) return NextResponse.json({ error: "Los datos no son válidos." }, { status: 400 });

  /* Asignar una zona a un negocio que propuso la suya. */
  if (entrada.accion === "asignar") {
    if (!esUuid(entrada.negocio_id) || !esUuid(entrada.zona_id)) {
      return NextResponse.json({ error: "Elegí la zona." }, { status: 400 });
    }
    const { error } = await supabase.rpc("admin_asignar_zona", {
      p_negocio_id: entrada.negocio_id,
      p_zona_id: entrada.zona_id,
    });
    if (error?.message.includes("ZONA_DE_OTRA_CIUDAD")) {
      return NextResponse.json({ error: "Esa zona es de otra ciudad." }, { status: 409 });
    }
    if (error) return NextResponse.json({ error: "No se pudo asignar la zona." }, { status: 403 });
    return NextResponse.json({ asignada: true });
  }

  if (!esUuid(entrada.id)) {
    return NextResponse.json({ error: "Esa zona no existe." }, { status: 400 });
  }

  /* Dar de baja o volver a activar. No se borra: un negocio puede tenerla
     asignada, y al darla de baja deja de ofrecerse sin romper a nadie. */
  if (entrada.accion === "activa") {
    /* Con `select`: una actualización que la política de la tabla no deja
       pasar no da error, deja cero filas tocadas. Sin mirarlas, esta ruta diría
       «guardado» a quien no es administrador. */
    const { data, error } = await supabase
      .from("zonas")
      .update({ activa: entrada.activa === true })
      .eq("id", entrada.id)
      .select("id");
    if (error || !data?.length) {
      return NextResponse.json({ error: "No se pudo cambiar la zona." }, { status: 403 });
    }
    return NextResponse.json({ guardada: true });
  }

  const { errores, fila } = leerZona(entrada);
  if (Object.keys(errores).length > 0) {
    return NextResponse.json({ error: "Revisá la zona.", errores }, { status: 400 });
  }
  const { data, error } = await supabase.from("zonas").update(fila).eq("id", entrada.id).select("id");
  if (error?.code === "23505") {
    return NextResponse.json({ error: "Esa zona ya existe en esa ciudad." }, { status: 409 });
  }
  if (error || !data?.length) {
    return NextResponse.json({ error: "No se pudo guardar la zona." }, { status: 403 });
  }
  return NextResponse.json({ guardada: true });
}
