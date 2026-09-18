import type { SupabaseClient } from "@supabase/supabase-js";

import type { CitaAgenda, RecursoAdmin, ServicioAgendable } from "../../components/agenda/gestor-agenda";
import type { Database } from "../supabase/database.types";

/* Lo que hace falta para dibujar la agenda del dueño.
 *
 * Vivía dentro de la página de Agenda. Sale acá porque la agenda dejó de tener
 * pantalla propia: los turnos del día se ven junto con los pedidos, que es donde
 * el dueño mira «qué tengo que resolver hoy».
 */

/* Del rango de Postgres —«["2026-09-14 14:00:00+00","2026-09-14 15:00:00+00")»—
   a dos instantes. Se parte acá para que el cliente no tenga que conocer cómo la
   base escribe un rango. */
function partirRango(rango: unknown): { inicio: string; fin: string } {
  const texto = String(rango).replace(/^[[(]/, "").replace(/[\])]$/, "");
  const [inicio, fin] = texto.split(",").map((parte) => parte.replace(/"/g, "").trim());
  return { inicio: new Date(inicio).toISOString(), fin: new Date(fin).toISOString() };
}

export type AgendaAdmin = {
  recursos: RecursoAdmin[];
  citas: CitaAgenda[];
  servicios: ServicioAgendable[];
};

export async function leerAgendaAdmin(
  supabase: SupabaseClient<Database>,
  negocioId: string,
): Promise<AgendaAdmin> {
  /* Desde el comienzo de hoy en Bolivia, no desde este instante: el dueño quiere
     ver el turno de las 9 aunque sean las 11. Bolivia está cuatro horas detrás
     de UTC y no cambia de hora, así que la medianoche de allá son las 04:00 de
     acá. */
  const desde = new Date();
  desde.setTime(desde.getTime() - 4 * 3600_000);
  desde.setUTCHours(4, 0, 0, 0);

  const [resultadoRecursos, resultadoCitas, resultadoServicios] = await Promise.all([
    supabase
      .from("recursos")
      .select(
      "id,nombre,orden,activo,acepta_reservas,agenda_recurso(franjas,duracion_minutos,cupo_por_franja)",
    )
      .eq("negocio_id", negocioId)
      .order("orden")
      .order("nombre"),
    supabase
      .from("citas")
      .select(
        "id,codigo,recurso_id,rango,nombre_cliente,telefono_cliente,nota,nota_interna,estado,origen,productos(nombre)",
      )
      .eq("negocio_id", negocioId)
      /* `rangeGte` y no `gte`: la columna es un rango de tiempo, y compararla con
         una fecha suelta hace que Postgres rechace la consulta entera con
         «malformed range literal». Con `gte` la pantalla mostraba cero turnos
         **sin ningún error a la vista**, porque el error se ignoraba abajo.
         «No se extiende a la izquierda de [desde, ∞)» es exactamente «empieza en
         desde o después». */
      .rangeGte("rango", `[${desde.toISOString()},)`)
      .order("rango")
      .range(0, 199),
    supabase
      .from("productos")
      .select("id,nombre,recurso_id,categorias!inner(vende)")
      .eq("negocio_id", negocioId)
      .eq("categorias.vende", "tiempo")
      .is("eliminado_en", null)
      .order("nombre"),
  ]);

  /* Las tres consultas fallan a la vista. La primera versión solo miraba la de
     recursos, y por eso una consulta de citas rota se veía como «no hay turnos»
     en vez de como un error: el dueño no podía confirmar nada y no sabía por
     qué. */
  if (resultadoRecursos.error) throw new Error("No se pudo cargar la agenda.");
  if (resultadoCitas.error) {
    throw new Error(`No se pudieron cargar los turnos: ${resultadoCitas.error.message}`);
  }
  if (resultadoServicios.error) throw new Error("No se pudieron cargar los servicios.");

  const recursos = (resultadoRecursos.data ?? []).map((fila) => {
    const agenda = Array.isArray(fila.agenda_recurso) ? fila.agenda_recurso[0] : fila.agenda_recurso;
    return {
      id: fila.id,
      nombre: fila.nombre,
      orden: fila.orden,
      activo: fila.activo,
      acepta_reservas: fila.acepta_reservas,
      franjas: agenda?.franjas ?? [],
      duracion_minutos: agenda?.duracion_minutos ?? null,
      /* Cuántos atiende a la vez. Sin agenda todavía, uno: es lo que la base
         pone por omisión cuando se la crea. */
      cupo_por_franja: Number(agenda?.cupo_por_franja ?? 1),
    };
  }) as RecursoAdmin[];

  const citas = (resultadoCitas.data ?? []).map((fila) => {
    const { inicio, fin } = partirRango(fila.rango);
    const producto = Array.isArray(fila.productos) ? fila.productos[0] : fila.productos;
    return {
      id: fila.id,
      codigo: fila.codigo,
      recurso_id: fila.recurso_id,
      inicio,
      fin,
      producto: (producto as { nombre?: string } | null)?.nombre ?? null,
      nombre_cliente: fila.nombre_cliente,
      telefono_cliente: fila.telefono_cliente,
      nota: fila.nota,
      nota_interna: fila.nota_interna,
      estado: fila.estado,
      origen: fila.origen,
    };
  }) as CitaAgenda[];

  const servicios = (resultadoServicios.data ?? []).map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    recurso_id: fila.recurso_id,
  })) as ServicioAgendable[];

  return { recursos, citas, servicios };
}
