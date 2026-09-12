import type { SupabaseClient } from "@supabase/supabase-js";

import { leerFranjas } from "./franjas";
import type { Agenda, CuposTomados } from "./horarios";

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
      "id,nombre,precio,categoria_id,visible,categorias!inner(vende,agenda_categoria(duracion_minutos,cupo_por_franja,anticipacion_minima_horas,dias_maximos,franjas))",
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

  return {
    id: data.id,
    nombre: data.nombre,
    precio: Number(data.precio),
    negocioId,
    agenda: {
      duracionMinutos: Number(fila.duracion_minutos ?? 30),
      cupoPorFranja: Number(fila.cupo_por_franja ?? 1),
      anticipacionMinimaHoras: Number(fila.anticipacion_minima_horas ?? 2),
      diasMaximos: Number(fila.dias_maximos ?? 30),
      franjas,
    },
  };
}

/* Cuántos cupos hay tomados en cada comienzo, entre dos instantes.
 *
 * Pasa por la función `cupos_tomados` de la base y no por un `select` sobre
 * `citas`: la tabla está cerrada para `anon` porque guarda nombre y teléfono de
 * personas, y lo que el catálogo público necesita es la cuenta, no quién
 * reservó. La función devuelve cuentas y nada más.
 */
export async function contarCuposTomados(
  supabase: SupabaseClient,
  productoId: string,
  desde: Date,
  hasta: Date,
): Promise<CuposTomados> {
  const { data } = await supabase.rpc("cupos_tomados", {
    p_producto_id: productoId,
    p_desde: desde.toISOString(),
    p_hasta: hasta.toISOString(),
  });

  const tomados: CuposTomados = {};
  for (const fila of (data ?? []) as Array<{ inicio: string; tomados: number }>) {
    /* Se normaliza el instante antes de usarlo como llave: Postgres devuelve
       «+00:00» y el cálculo de horarios genera «Z». Sin esto las llaves no
       coinciden nunca y todas las franjas se verían libres. */
    tomados[new Date(fila.inicio).toISOString()] = Number(fila.tomados);
  }
  return tomados;
}
