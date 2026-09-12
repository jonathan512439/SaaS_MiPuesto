import type { SupabaseClient } from "@supabase/supabase-js";

import { leerFranjas } from "./franjas";
import type { Agenda, Ocupado } from "./horarios";

/* Lo que las rutas necesitan de la base para trabajar con la agenda.
 *
 * Vive acá y no dentro de cada ruta porque las tres —los horarios libres, tomar
 * una cita, y el panel del dueño— necesitan lo mismo: la agenda de la categoría
 * del producto. Escrito una vez, no puede desincronizarse entre ellas.
 */

export type ProductoAgendable = {
  id: string;
  nombre: string;
  precio: number;
  negocioId: string;
  /* La categoría es el recurso: el calendario y los choques son suyos, no del
     producto. Un consultorio con un solo profesional y cinco servicios tiene una
     sola agenda, y la comparten los cinco. */
  categoriaId: string;
  agenda: Agenda;
};

/* El producto con la agenda de su categoría, si de verdad vende tiempo.
 *
 * Devuelve nulo en cuatro casos distintos y **a propósito no los distingue**: el
 * producto no existe, no es de este negocio, su categoría vende cosas, o esa
 * categoría no tiene agenda configurada. Para quien pregunta desde afuera los
 * cuatro significan lo mismo —«acá no se agenda»— y separarlos le diría a un
 * curioso qué productos existen en negocios ajenos.
 */
export async function obtenerProductoAgendable(
  supabase: SupabaseClient,
  negocioId: string,
  productoId: string,
): Promise<ProductoAgendable | null> {
  const { data } = await supabase
    .from("productos")
    .select(
      "id,nombre,precio,duracion_minutos,categoria_id,visible,categorias!inner(vende,agenda_categoria(duracion_minutos,cupo_por_franja,anticipacion_minima_horas,dias_maximos,franjas))",
    )
    .eq("id", productoId)
    .eq("negocio_id", negocioId)
    .is("eliminado_en", null)
    .eq("visible", true)
    .maybeSingle();

  if (!data) return null;

  const categoria = data.categorias as {
    vende?: string;
    agenda_categoria?: unknown;
  } | null;
  if (categoria?.vende !== "tiempo") return null;

  /* La relación uno a uno llega como objeto o como arreglo de uno según cómo
     resuelva la consulta. Se acepta cualquiera de las dos en vez de confiar en
     una: la forma cambia con la versión del cliente, y el día que cambie sería
     un catálogo sin horarios y sin ningún error a la vista. */
  const cruda = Array.isArray(categoria.agenda_categoria)
    ? categoria.agenda_categoria[0]
    : categoria.agenda_categoria;
  if (!cruda) return null;

  const fila = cruda as Record<string, unknown>;
  const franjas = leerFranjas(fila.franjas);
  if (franjas.length === 0) return null;

  if (!data.categoria_id) return null;

  return {
    id: data.id,
    nombre: data.nombre,
    precio: Number(data.precio),
    negocioId,
    categoriaId: data.categoria_id,
    agenda: {
      /* La del producto si la tiene, la de su categoría si no. Es lo que permite
         que una valoración dure una hora y una vacunación quince minutos dentro
         del mismo calendario. */
      duracionMinutos: Number(data.duracion_minutos ?? fila.duracion_minutos ?? 30),
      cupoPorFranja: Number(fila.cupo_por_franja ?? 1),
      anticipacionMinimaHoras: Number(fila.anticipacion_minima_horas ?? 2),
      diasMaximos: Number(fila.dias_maximos ?? 30),
      franjas,
    },
  };
}

/* Qué está ocupado en el calendario de la categoría, entre dos instantes.
 *
 * Pasa por `ocupacion_categoria` y no por un `select` sobre `citas`: la tabla
 * está cerrada para `anon` porque guarda nombre y teléfono de personas. La
 * función devuelve rangos y números de cupo, nunca de quién son.
 */
export async function obtenerOcupacion(
  supabase: SupabaseClient,
  categoriaId: string,
  desde: Date,
  hasta: Date,
): Promise<Ocupado[]> {
  const { data } = await supabase.rpc("ocupacion_categoria", {
    p_categoria_id: categoriaId,
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
