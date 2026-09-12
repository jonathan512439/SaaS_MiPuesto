import { NextResponse, type NextRequest } from "next/server";

import {
  leerJson,
  obtenerContextoAdminCatalogo,
} from "../../../../lib/catalogo/servidor";
import { esUuid } from "../../../../lib/catalogo/validacion";

/* El dueño resuelve un turno: lo confirma, lo marca cumplido o lo cancela.
 *
 * Solo cambia el estado. La hora no se puede mover desde acá a propósito:
 * correrla sería tomar otro horario, con todo lo que eso implica —que esté
 * libre, que caiga en la agenda—, y eso es cancelar y volver a agendar. Un
 * botón que parece «mover» y a veces falla es peor que no tenerlo.
 */

const ESTADOS = ["confirmada", "cancelada", "cumplida"] as const;

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
    return NextResponse.json({ error: "El turno no es válido." }, { status: 400 });
  }
  if (typeof datos.estado !== "string" || !(ESTADOS as readonly string[]).includes(datos.estado)) {
    return NextResponse.json({ error: "Indicá qué hacer con el turno." }, { status: 400 });
  }

  const { data, error } = await contexto.supabase
    .from("citas")
    .update({
      estado: datos.estado,
      /* La cancelación lleva su marca de tiempo porque la base la exige: sin
         ella el `check` rechaza la fila. Y con motivo: una cita cancelada sin
         cuándo no se puede auditar después. */
      cancelado_en: datos.estado === "cancelada" ? new Date().toISOString() : null,
    })
    .eq("id", datos.id)
    .eq("negocio_id", contexto.negocio.id)
    .select("id,estado")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo actualizar el turno." }, { status: 404 });
  }
  return NextResponse.json({ cita: data });
}
