import type { SupabaseClient } from "@supabase/supabase-js";

import { leerFranjas } from "./franjas";
import type { Agenda, Ocupado } from "./horarios";

/* Lo que las rutas necesitan de la base para trabajar con la agenda.
 *
 * Vive acá y no dentro de cada ruta porque las tres —los horarios libres, tomar
 * una cita, y el panel del dueño— necesitan lo mismo: el recurso que atiende el
 * producto, con su agenda. Escrito una vez, no puede desincronizarse.
 */

export type ProductoAgendable = {
  id: string;
  nombre: string;
  precio: number;
  negocioId: string;
  categoriaId: string;
  /* El recurso es el dueño del calendario y de los choques: el doctor, el
     peluquero, el consultorio. Dos productos chocan si comparten recurso. */
  recursoId: string;
  agenda: Agenda;
};

type FilaAgenda = {
  duracion_minutos?: number | null;
  cupo_por_franja?: number | null;
  anticipacion_minima_horas?: number | null;
  dias_maximos?: number | null;
  franjas?: unknown;
};

/* La relación uno a uno llega como objeto o como arreglo de uno según cómo
   resuelva la consulta. Se acepta cualquiera de las dos en vez de confiar en
   una: la forma cambia con la versión del cliente, y el día que cambie sería un
   catálogo sin horarios y sin ningún error a la vista. */
function unaFila<T>(valor: unknown): T | null {
  if (Array.isArray(valor)) return (valor[0] as T) ?? null;
  return (valor as T) ?? null;
}

export function agendaDesdeFila(fila: FilaAgenda, duracionProducto?: number | null): Agenda | null {
  const franjas = leerFranjas(fila.franjas);
  if (franjas.length === 0) return null;
  return {
    /* La del producto si la tiene, la del recurso si no. Es lo que permite que
       una valoración dure una hora y una vacunación quince minutos con la misma
       persona. */
    duracionMinutos: Number(duracionProducto ?? fila.duracion_minutos ?? 30),
    cupoPorFranja: Number(fila.cupo_por_franja ?? 1),
    anticipacionMinimaHoras: Number(fila.anticipacion_minima_horas ?? 2),
    diasMaximos: Number(fila.dias_maximos ?? 30),
    franjas,
  };
}

/* El producto con la agenda de su recurso, si de verdad se puede agendar.
 *
 * Devuelve nulo en varios casos distintos y **a propósito no los distingue**: el
 * producto no existe, no es de este negocio, su categoría vende cosas, no tiene
 * recurso, el recurso no acepta reservas, o no tiene horario. Para quien
 * pregunta desde afuera todos significan «acá no se agenda», y separarlos le
 * diría a un curioso qué productos existen en negocios ajenos.
 */
export async function obtenerProductoAgendable(
  supabase: SupabaseClient,
  negocioId: string,
  productoId: string,
): Promise<ProductoAgendable | null> {
  const { data } = await supabase
    .from("productos")
    /* Un solo literal y no cadenas concatenadas: el cliente de la base infiere el
       tipo del resultado a partir del literal, y una concatenación le hace
       devolver un tipo de error genérico que no tiene ninguna columna. */
    .select(
      "id,nombre,precio,duracion_minutos,categoria_id,recurso_id,visible,categorias!inner(vende),recursos(activo,acepta_reservas,agenda_recurso(duracion_minutos,cupo_por_franja,anticipacion_minima_horas,dias_maximos,franjas))",
    )
    .eq("id", productoId)
    .eq("negocio_id", negocioId)
    .is("eliminado_en", null)
    .eq("visible", true)
    .maybeSingle();

  if (!data || !data.categoria_id || !data.recurso_id) return null;

  const categoria = unaFila<{ vende?: string }>(data.categorias);
  if (categoria?.vende !== "tiempo") return null;

  const recurso = unaFila<{
    activo?: boolean;
    acepta_reservas?: boolean;
    agenda_recurso?: unknown;
  }>(data.recursos);
  /* El botón de apagar del dueño se respeta acá: con `acepta_reservas` en falso
     el catálogo no ofrece horarios, aunque la agenda esté completa. */
  if (!recurso || recurso.activo === false || recurso.acepta_reservas === false) return null;

  const filaAgenda = unaFila<FilaAgenda>(recurso.agenda_recurso);
  if (!filaAgenda) return null;

  const agenda = agendaDesdeFila(filaAgenda, data.duracion_minutos);
  if (!agenda) return null;

  return {
    id: data.id,
    nombre: data.nombre,
    precio: Number(data.precio),
    negocioId,
    categoriaId: data.categoria_id,
    recursoId: data.recurso_id,
    agenda,
  };
}

/* Qué está ocupado en el calendario de un recurso, entre dos instantes.
 *
 * Pasa por `ocupacion_recurso` y no por un `select` sobre `citas`: la tabla está
 * cerrada para `anon` porque guarda nombre y teléfono de personas. La función
 * devuelve rangos y números de cupo, nunca de quién son.
 */
export async function obtenerOcupacion(
  supabase: SupabaseClient,
  recursoId: string,
  desde: Date,
  hasta: Date,
): Promise<Ocupado[]> {
  const { data } = await supabase.rpc("ocupacion_recurso", {
    p_recurso_id: recursoId,
    p_desde: desde.toISOString(),
    p_hasta: hasta.toISOString(),
  });

  return ((data ?? []) as Array<{ inicio: string; fin: string; cupo: number }>).map((fila) => ({
    /* Se normalizan los instantes: Postgres devuelve «+00:00» y el cálculo de
       horarios trabaja con «Z». Comparar textos sin normalizar haría que nada
       pareciera ocupado. */
    inicio: new Date(fila.inicio).toISOString(),
    fin: new Date(fila.fin).toISOString(),
    cupo: Number(fila.cupo),
  }));
}
