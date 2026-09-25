import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../supabase/database.types";
import { renombresDeCategorias } from "../negocios/rubros-publicos";
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

/* La siembra, ya traducida a filas de la base pero todavía sin escribir.
 *
 * Se separa del acto de escribirla porque hay **dos caminos** que la necesitan y
 * escriben distinto: el alta, donde el dueño la inserta con su propia sesión, y
 * el cambio de rubro, donde la plataforma se la manda a una función de la base
 * porque nadie más puede escribir en el catálogo de otro.
 *
 * Con esto los dos parten de la misma traducción. Si cada uno tradujera lo suyo,
 * el día que un campo cambie de nombre quedaría bien en el alta y mal en el
 * cambio de rubro, o al revés, y nadie lo notaría hasta que un negocio cambiado
 * de rubro apareciera con los datos de sus categorías vacíos.
 *
 * Los atributos y las agendas se refieren a su categoría **por nombre** y no por
 * id: los ids no existen hasta que las categorías están escritas, y quien las
 * escribe es el otro lado. */
export type CargaDeSiembra = {
  categorias: Array<{
    nombre: string;
    icono: string;
    vende: string;
    orden: number;
    visible: boolean;
  }>;
  atributos: Array<{
    categoria: string;
    clave: string;
    nombre: string;
    tipo: string;
    unidad: string | null;
    opciones: string[];
    obligatorio: boolean;
    en_tarjeta: boolean;
    en_resumen: boolean;
    orden: number;
  }>;
  recursos: Array<{
    nombre: string;
    orden: number;
    activo: boolean;
    acepta_reservas: boolean;
    agenda: {
      duracion_minutos: number;
      cupo_por_franja: number;
      anticipacion_minima_horas: number;
      dias_maximos: number;
      franjas: Array<{ dia: number; desde: string; hasta: string }>;
    };
  }>;
};

export function armarSiembra(rubro: string, rubroPublico?: string | null): CargaDeSiembra | null {
  const siembra = siembraDeRubro(rubro);
  /* El rubro público puede darles a las categorías el nombre de su negocio
     —«Hamburguesas» y no «Almuerzos»—; los campos las siguen por ese nombre. */
  const renombres = renombresDeCategorias(rubroPublico);
  const nombreDe = (nombre: string) => renombres[nombre] ?? nombre;
  /* Cuatro de los diez rubros no tienen siembra y eso no es un error: se les
     arma cuando llegue el primer cliente de ese rubro. */
  if (!siembra) return null;

  const categorias = siembra.categorias.map((categoria, posicion) => ({
    nombre: nombreDe(categoria.nombre),
    icono: categoria.icono,
    vende: categoria.vende,
    orden: posicion + 1,
    visible: true,
  }));

  const atributos = siembra.categorias.flatMap((categoria) =>
    (categoria.atributos ?? []).map((atributo, posicion) => ({
      categoria: nombreDe(categoria.nombre),
      clave: atributo.clave,
      nombre: atributo.nombre,
      tipo: atributo.tipo as string,
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

  /* Las categorías que venden tiempo necesitan **un recurso**, que es quien hace
     el trabajo: el calendario cuelga de él y no de la categoría. Sin recurso, la
     categoría existe y el cliente abre el calendario y no encuentra nada.
     Se crea uno por categoría de tiempo y con su nombre: una veterinaria arranca
     con «Consultas», «Vacunación» y «Baño y peluquería» como tres recursos, y el
     dueño los renombra a los nombres de su gente si quiere. */
  const recursos = siembra.categorias
    .filter((categoria) => categoria.agenda)
    .map((categoria, posicion) => ({
      nombre: nombreDe(categoria.nombre),
      orden: posicion + 1,
      activo: true,
      acepta_reservas: true,
      agenda: {
        duracion_minutos: categoria.agenda!.duracionMinutos,
        cupo_por_franja: categoria.agenda!.cupo,
        anticipacion_minima_horas: categoria.agenda!.anticipacionHorasMinima,
        dias_maximos: categoria.agenda!.diasHaciaAdelante,
        franjas: categoria.agenda!.franjas,
      },
    }));

  return { categorias, atributos, recursos };
}

export async function sembrarRubro(
  supabase: Cliente,
  negocioId: string,
  rubro: string,
  rubroPublico?: string | null,
): Promise<ResultadoSiembra> {
  const carga = armarSiembra(rubro, rubroPublico);
  if (!carga) return { sembro: false, motivo: "sin-siembra" };

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
    .insert(carga.categorias.map((categoria) => ({ ...categoria, negocio_id: negocioId })))
    .select("id,nombre");

  if (errorCategorias || !categorias) {
    throw new Error("No se pudo preparar el catálogo del rubro.");
  }

  /* Se vuelven a encontrar por nombre porque el `insert` devuelve las filas en
     el orden en que se mandaron, pero apoyarse en eso es apoyarse en un detalle
     que nadie prometió. */
  const idPorNombre = new Map(categorias.map(({ id, nombre }) => [nombre, id]));

  const atributos = carga.atributos.map(({ categoria, ...resto }) => ({
    ...resto,
    negocio_id: negocioId,
    categoria_id: idPorNombre.get(categoria) ?? "",
  }));

  if (atributos.length > 0) {
    const { error } = await supabase.from("atributos_categoria").insert(atributos);
    if (error) throw new Error("No se pudieron preparar los datos de las categorías.");
  }

  let recursos = 0;

  if (carga.recursos.length > 0) {
    const { data: creados, error } = await supabase
      .from("recursos")
      .insert(
        /* El horario va en su propia tabla, asi que el recurso viaja sin el. */
        carga.recursos.map((recurso) => ({
          negocio_id: negocioId,
          nombre: recurso.nombre,
          orden: recurso.orden,
          activo: recurso.activo,
          acepta_reservas: recurso.acepta_reservas,
        })),
      )
      .select("id,nombre");

    if (error || !creados) throw new Error("No se pudo preparar la agenda del rubro.");
    recursos = creados.length;

    const idRecursoPorNombre = new Map(creados.map(({ id, nombre }) => [nombre, id]));
    const agendas = carga.recursos.map((recurso) => ({
      ...recurso.agenda,
      negocio_id: negocioId,
      recurso_id: idRecursoPorNombre.get(recurso.nombre) ?? "",
    }));

    const { error: errorAgenda } = await supabase.from("agenda_recurso").insert(agendas);
    if (errorAgenda) throw new Error("No se pudo preparar el horario de atención.");
  }

  return {
    sembro: true,
    categorias: categorias.length,
    atributos: atributos.length,
    recursos,
  };
}
