import { NextResponse, type NextRequest } from "next/server";

import {
  leerJson,
  obtenerContextoAdminCatalogo,
} from "../../../../lib/catalogo/servidor";
import { esUuid } from "../../../../lib/catalogo/validacion";

/* Los recursos del negocio: quién hace el trabajo.
 *
 * Un profesional, un consultorio, una silla. Cada uno tiene su calendario y sus
 * choques: dos servicios del mismo recurso no se pueden dar a la misma hora.
 */

const COLUMNAS = "id,nombre,orden,activo,acepta_reservas" as const;
const MAXIMO_RECURSOS = 20;

function nombreLimpio(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const nombre = valor.trim().replace(/\s+/g, " ");
  return nombre.length >= 1 && nombre.length <= 60 ? nombre : null;
}

export async function GET() {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const { data, error } = await contexto.supabase
    .from("recursos")
    .select(COLUMNAS)
    .eq("negocio_id", contexto.negocio.id)
    .order("orden")
    .order("nombre");
  if (error) {
    return NextResponse.json({ error: "No se pudieron leer los recursos." }, { status: 500 });
  }
  return NextResponse.json({ recursos: data });
}

export async function POST(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const entrada = await leerJson(solicitud);
  if (!entrada.correcto || typeof entrada.datos !== "object" || entrada.datos === null) {
    return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
  }
  const nombre = nombreLimpio((entrada.datos as Record<string, unknown>).nombre);
  if (!nombre) {
    return NextResponse.json({ error: "Escribe cómo se llama: «Dr. Ana», «Consultorio 2»." }, { status: 400 });
  }

  const { count } = await contexto.supabase
    .from("recursos")
    .select("id", { count: "exact", head: true })
    .eq("negocio_id", contexto.negocio.id);
  if ((count ?? 0) >= MAXIMO_RECURSOS) {
    return NextResponse.json(
      { error: `Hasta ${MAXIMO_RECURSOS} recursos por negocio.` },
      { status: 409 },
    );
  }

  const { data, error } = await contexto.supabase
    .from("recursos")
    .insert({ negocio_id: contexto.negocio.id, nombre, orden: count ?? 0 })
    .select(COLUMNAS)
    .single();
  if (error) {
    /* El nombre repetido es el único error que el dueño puede arreglar solo, y
       por eso se le dice cuál es en vez de un «no se pudo». */
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ya tienes un recurso con ese nombre." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo crear el recurso." }, { status: 500 });
  }
  return NextResponse.json({ recurso: data }, { status: 201 });
}

export async function PATCH(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const entrada = await leerJson(solicitud);
  if (!entrada.correcto || typeof entrada.datos !== "object" || entrada.datos === null) {
    return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
  }
  const datos = entrada.datos as Record<string, unknown>;
  if (!esUuid(datos.id)) {
    return NextResponse.json({ error: "El recurso no es válido." }, { status: 400 });
  }

  const cambios: { nombre?: string; activo?: boolean; acepta_reservas?: boolean } = {};
  if (datos.nombre !== undefined) {
    const nombre = nombreLimpio(datos.nombre);
    if (!nombre) return NextResponse.json({ error: "El nombre no es válido." }, { status: 400 });
    cambios.nombre = nombre;
  }
  if (datos.activo !== undefined) {
    if (typeof datos.activo !== "boolean") {
      return NextResponse.json({ error: "El estado no es válido." }, { status: 400 });
    }
    cambios.activo = datos.activo;
  }
  /* El botón de apagar. Se acepta solo, sin más datos: es lo que el dueño toca
     cuando el doctor se enferma, y tiene que ser un gesto. */
  if (datos.acepta_reservas !== undefined) {
    if (typeof datos.acepta_reservas !== "boolean") {
      return NextResponse.json({ error: "El estado no es válido." }, { status: 400 });
    }
    cambios.acepta_reservas = datos.acepta_reservas;
  }
  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: "No hay nada que cambiar." }, { status: 400 });
  }

  const { data, error } = await contexto.supabase
    .from("recursos")
    .update(cambios)
    .eq("id", datos.id)
    .eq("negocio_id", contexto.negocio.id)
    .select(COLUMNAS)
    .maybeSingle();
  if (error?.code === "23505") {
    return NextResponse.json({ error: "Ya tienes un recurso con ese nombre." }, { status: 409 });
  }
  if (error || !data) {
    return NextResponse.json({ error: "No se pudo actualizar el recurso." }, { status: 404 });
  }
  return NextResponse.json({ recurso: data });
}

export async function DELETE(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const entrada = await leerJson(solicitud);
  const id =
    entrada.correcto && typeof entrada.datos === "object" && entrada.datos !== null
      ? (entrada.datos as Record<string, unknown>).id
      : undefined;
  if (!esUuid(id)) return NextResponse.json({ error: "El recurso no es válido." }, { status: 400 });

  /* No se borra un recurso con citas por delante: desaparecerían del panel las
     personas que ya tienen hora. Primero se cancelan o se reasignan; después se
     borra. El número va en el mensaje para que el dueño sepa cuánto es. */
  const { count, error: errorConteo } = await contexto.supabase
    .from("citas")
    .select("id", { count: "exact", head: true })
    .eq("recurso_id", id)
    .eq("negocio_id", contexto.negocio.id)
    .neq("estado", "cancelada")
    /* `rangeGte` y no `gte`: la columna es un rango, y con `gte` Postgres
       rechazaba la consulta. Peor: el error se ignoraba, el conteo quedaba en
       nulo, y el recurso se borraba **con turnos por delante**. */
    .rangeGte("rango", `[${new Date().toISOString()},)`);
  if (errorConteo) {
    return NextResponse.json({ error: "No se pudo comprobar los turnos del recurso." }, { status: 500 });
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `Este recurso tiene ${count} ${count === 1 ? "turno" : "turnos"} por delante. Cancélalos antes de borrarlo.`,
      },
      { status: 409 },
    );
  }

  const { data, error } = await contexto.supabase
    .from("recursos")
    .delete()
    .eq("id", id)
    .eq("negocio_id", contexto.negocio.id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "No se pudo borrar el recurso." }, { status: 404 });
  }
  return NextResponse.json({ eliminado: true });
}
