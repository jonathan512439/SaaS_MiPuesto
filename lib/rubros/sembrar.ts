import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../supabase/database.types";
import { siembraDeRubro } from "./siembra";

/* Crear el catálogo de arranque de un rubro.
 *
 * Corre **una sola vez**, al elegir el rubro en el alta, y desde el servidor.
 *
 * **Nunca siembra sobre algo que ya existe.** Si el negocio tiene aunque sea una
 * categoría, no se toca nada: el caso real es el dueño que vuelve al paso 2 para
 * releer el aviso y guarda de nuevo. Sembrar ahí le duplicaría las categorías y
 * le pisaría los nombres que ya cambió. Es la diferencia entre ayudarlo a
 * arrancar y decidir por él.
 *
 * Lo sembrado es suyo desde el primer segundo: lo renombra, lo borra o le agrega
 * lo suyo. Por eso no queda ninguna marca de «esto lo puso el sistema».
 */

type Cliente = SupabaseClient<Database>;

export type ResultadoSiembra =
  | { sembro: false; motivo: "sin-siembra" | "ya-tenia-catalogo" }
  | { sembro: true; categorias: number; atributos: number; recursos: number };

export async function sembrarRubro(
  supabase: Cliente,
  negocioId: string,
  rubro: string,
): Promise<ResultadoSiembra> {
  const siembra = siembraDeRubro(rubro);
  /* Cuatro de los diez rubros no tienen siembra y eso no es un error: se les
     arma cuando llegue el primer cliente de ese rubro. */
  if (!siembra) return { sembro: false, motivo: "sin-siembra" };

  const { count } = await supabase
    .from("categorias")
    .select("id", { count: "exact", head: true })
    .eq("negocio_id", negocioId);

  if ((count ?? 0) > 0) return { sembro: false, motivo: "ya-tenia-catalogo" };

  /* Las categorías van en una sola escritura y no una por una: son hasta siete,
     y siete idas a la base mientras el dueño mira una pantalla de espera se
     notan. Además, si una fallara a mitad de camino quedaría un catálogo
     sembrado por la mitad. */
  const { data: categorias, error: errorCategorias } = await supabase
    .from("categorias")
    .insert(
      siembra.categorias.map((categoria, posicion) => ({
        negocio_id: negocioId,
        nombre: categoria.nombre,
        icono: categoria.icono,
        vende: categoria.vende,
        orden: posicion + 1,
        visible: true,
      })),
    )
    .select("id,nombre");

  if (errorCategorias || !categorias) {
    throw new Error("No se pudo preparar el catálogo del rubro.");
  }

  /* Se vuelven a encontrar por nombre porque el `insert` devuelve las filas en
     el orden en que se mandaron, pero apoyarse en eso es apoyarse en un detalle
     que nadie prometió. */
  const idPorNombre = new Map(categorias.map(({ id, nombre }) => [nombre, id]));

  const atributos = siembra.categorias.flatMap((categoria) =>
    (categoria.atributos ?? []).map((atributo, posicion) => ({
      negocio_id: negocioId,
      categoria_id: idPorNombre.get(categoria.nombre) ?? "",
      clave: atributo.clave,
      nombre: atributo.nombre,
      tipo: atributo.tipo,
      unidad: atributo.unidad ?? null,
      opciones: atributo.opciones ?? [],
      obligatorio: false,
      en_tarjeta: atributo.enTarjeta === true,
      /* En el resumen del pedido no va nada por omisión: lo elige el dueño
         cuando sepa qué necesita leer al preparar un pedido. */
      en_resumen: false,
      orden: posicion + 1,
    })),
  );

  if (atributos.length > 0) {
    const { error } = await supabase.from("atributos_categoria").insert(atributos);
    if (error) throw new Error("No se pudieron preparar los datos de las categorías.");
  }

  /* Las categorías que venden tiempo necesitan **un recurso**, que es quien hace
     el trabajo: el calendario cuelga de él y no de la categoría. Sin recurso, la
     categoría existe y el cliente abre el calendario y no encuentra nada.
     Se crea uno por categoría de tiempo y con su nombre: una veterinaria arranca
     con «Consultas», «Vacunación» y «Baño y peluquería» como tres recursos, y el
     dueño los renombra a los nombres de su gente si quiere. */
  const deTiempo = siembra.categorias.filter((categoria) => categoria.agenda);
  let recursos = 0;

  if (deTiempo.length > 0) {
    const { data: creados, error } = await supabase
      .from("recursos")
      .insert(
        deTiempo.map((categoria, posicion) => ({
          negocio_id: negocioId,
          nombre: categoria.nombre,
          orden: posicion + 1,
          activo: true,
          acepta_reservas: true,
        })),
      )
      .select("id,nombre");

    if (error || !creados) throw new Error("No se pudo preparar la agenda del rubro.");
    recursos = creados.length;

    const idRecursoPorNombre = new Map(creados.map(({ id, nombre }) => [nombre, id]));
    const agendas = deTiempo.map((categoria) => ({
      negocio_id: negocioId,
      recurso_id: idRecursoPorNombre.get(categoria.nombre) ?? "",
      duracion_minutos: categoria.agenda!.duracionMinutos,
      cupo_por_franja: categoria.agenda!.cupo,
      anticipacion_minima_horas: categoria.agenda!.anticipacionHorasMinima,
      dias_maximos: categoria.agenda!.diasHaciaAdelante,
      franjas: categoria.agenda!.franjas,
    }));

    const { error: errorAgenda } = await supabase.from("agenda_recurso").insert(agendas);
    if (errorAgenda) throw new Error("No se pudo preparar el horario de atención.");
  }

  return { sembro: true, categorias: categorias.length, atributos: atributos.length, recursos };
}
