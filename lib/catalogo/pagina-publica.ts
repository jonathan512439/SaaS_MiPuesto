import { COLUMNAS_CATEGORIA, COLUMNAS_PRODUCTO_PUBLICO } from "./columnas";
import { calcularRango, extraerTerminos, leerFiltrosCatalogo } from "./consulta-publica";
import type { crearClienteSupabasePublico } from "../supabase/public";

/* Lo que hace falta leer para dibujar una página del catálogo público.
 *
 * Vive acá y no dentro de la pantalla porque **dos cosas lo necesitan**: la
 * pantalla, que sirve la primera página, y la ruta que trae las siguientes
 * cuando el visitante sigue bajando. Copiado en los dos, alcanzaría con que uno
 * agregue una columna para que el producto número trece salga distinto del
 * número doce en el mismo catálogo, y eso no lo notaría nadie hasta que un
 * cliente pregunte por un precio que no es.
 *
 * Se parte en dos porque cambian a ritmos distintos: los productos dependen de
 * la página y del filtro, y el resto —categorías, campos, promociones— es el
 * mismo para todas las páginas del mismo negocio.
 */

type Cliente = ReturnType<typeof crearClienteSupabasePublico>;

/* Filtrar y paginar acá, y no en el navegador, es lo que permite un catálogo de
   trescientos productos: antes viajaba la ficha completa de cada uno en cada
   visita para mostrar doce. */
export function consultarProductosPublicos(
  supabase: Cliente,
  negocioId: string,
  parametros: Record<string, string | string[] | undefined>,
  categoria: string,
) {
  const filtros = leerFiltrosCatalogo(parametros, []);
  const { desde, hasta } = calcularRango(filtros.pagina);

  let consulta = supabase
    .from("productos")
    .select(COLUMNAS_PRODUCTO_PUBLICO, { count: "exact" })
    .eq("negocio_id", negocioId)
    .eq("visible", true);

  if (categoria) consulta = consulta.eq("categoria_id", categoria);
  for (const termino of extraerTerminos(filtros.busqueda)) {
    consulta = consulta.ilike("texto_busqueda", `%${termino}%`);
  }

  return consulta.order("orden").order("creado_en").range(desde, hasta);
}

/* Todo lo que no cambia entre páginas, en un solo viaje.
 *
 * Son cinco consultas y van juntas a propósito: cada una es chica —las
 * categorías de un negocio, sus campos, sus promociones— y encadenarlas sumaría
 * cinco esperas antes de poder dibujar nada. */
export function consultarContextoPublico(supabase: Cliente, negocioId: string) {
  return Promise.all([
    supabase
      .from("categorias")
      .select(COLUMNAS_CATEGORIA)
      .eq("negocio_id", negocioId)
      .order("orden")
      .order("nombre"),
    /* Las presentaciones de todos los productos del negocio, en una consulta.
       Se filtran las ocultas al agrupar, no acá, para que el conteo del catálogo
       no dependa de dos lugares. */
    supabase
      .from("variantes_producto")
      .select("id,producto_id,nombre,precio,cantidad_stock,visible,orden")
      .eq("negocio_id", negocioId)
      .order("orden"),
    /* Las definiciones de campos de todas las categorías, en una sola consulta.
       Son diez filas por categoría como mucho, y el catálogo las necesita todas:
       pedirlas por categoría serían cuarenta viajes para dibujar una página. */
    supabase
      .from("atributos_categoria")
      .select("categoria_id,clave,nombre,tipo,unidad,opciones,en_tarjeta,en_resumen,orden")
      .eq("negocio_id", negocioId)
      .order("orden"),
    supabase
      .from("subcategorias")
      .select("id,categoria_id,nombre,orden,categorias!inner(negocio_id)")
      .eq("categorias.negocio_id", negocioId)
      .order("orden")
      .order("nombre"),
    supabase
      .from("promociones")
      .select(
        "id,tipo,valor,producto_id,categoria_id,fecha_inicio,fecha_fin,activo,hora_inicio,hora_fin,dias",
      )
      .eq("negocio_id", negocioId),
  ]);
}
