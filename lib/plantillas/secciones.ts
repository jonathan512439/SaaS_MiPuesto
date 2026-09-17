import type { CategoriaPlantilla, ProductoPlantilla } from "./tipos";

/* Cómo se reparten los productos de una categoría en la pantalla.
 *
 * Vive acá y no dentro de la plantilla porque **son reglas, no dibujo**. Están
 * escritas en el plan, cada una con el problema que evita, y una regla que solo
 * existe adentro de un componente de React no se puede comprobar sin dibujar la
 * pantalla entera.
 */

export type ProductoEnSeccion = ProductoPlantilla & {
  categoria: string;
  subcategoria: string | null;
};

export type SeccionDeCatalogo = {
  categoria: CategoriaPlantilla;
  /* Los que no están en ninguna subcategoría. Van **primero y sin subtítulo**:
     una categoría puede tener sueltos y agrupados a la vez, e inventarles un
     subtítulo —«Sin subcategoría»— le mostraría al comprador un problema de
     organización que es del dueño. */
  sueltos: ProductoEnSeccion[];
  grupos: Array<{ nombre: string; productos: ProductoEnSeccion[] }>;
  /* La cuenta de la categoría entera, que es la que va en su cabecera. Para el
     comprador «Bebidas» tiene doce productos, no tres grupos. */
  total: number;
};

export function armarSecciones(
  categorias: ReadonlyArray<CategoriaPlantilla>,
): SeccionDeCatalogo[] {
  return categorias
    .map((categoria) => {
      const sueltos: ProductoEnSeccion[] = categoria.productos.map((producto) => ({
        ...producto,
        categoria: categoria.nombre,
        subcategoria: null,
      }));

      const grupos = (categoria.subcategorias ?? [])
        .map((subcategoria) => ({
          nombre: subcategoria.nombre,
          productos: subcategoria.productos.map((producto) => ({
            ...producto,
            categoria: categoria.nombre,
            subcategoria: subcategoria.nombre,
          })),
        }))
        /* Una subcategoría sin productos no deja un subtítulo colgando. Pasa con
           las que el dueño creó y todavía no llenó, y con las que quedaron
           vacías al ocultar sus productos. */
        .filter(({ productos }) => productos.length > 0);

      return {
        categoria,
        sueltos,
        grupos,
        total:
          sueltos.length + grupos.reduce((suma, { productos }) => suma + productos.length, 0),
      };
    })
    /* Una categoría sin nada que mostrar no se dibuja. Se filtra **acá** y no
       adentro del dibujo con un `return null` a mitad de camino: sin el número
       de secciones que de verdad se van a ver, no se puede poner el anuncio «a
       la mitad». */
    .filter(({ total }) => total > 0);
}

/* Después de cuál sección va el banner de publicidad.
 *
 * Se decide con **las categorías que tiene el negocio**, no con las que hay
 * dibujadas en ese momento. Esa es toda la corrección.
 *
 * Contaba desde el final —«antes de la última categoría»— y eso lo hacía
 * saltar: con la carga al desplazar, cada tanda que llega agrega secciones, el
 * final se corre, la cuenta da otro número, y el banner se muda de lugar
 * mientras la persona está mirando, empujando las tarjetas que tenía debajo. El
 * dueño lo describió así: «el segundo banner se pasa brincando, a veces está en
 * un lado y luego se mueve a otro».
 *
 * Contar desde el principio no alcanzaba: un catálogo cuya primera tanda trae
 * una sola categoría daba 0, y al llegar la segunda pasaba a 1. La lista de
 * categorías del negocio, en cambio, está completa desde el primer dibujo y no
 * la cambian ni las tandas ni un filtro —es la misma de la que salen las
 * esferas—, así que el número sale igual siempre.
 *
 * Va después de la segunda porque el dueño lo pidió más arriba: una publicidad
 * al pie la ve solo quien llegó hasta abajo. Con una sola categoría cae después
 * de ella, que es lo único que hay.
 *
 * Lo que se acepta a cambio: si la segunda categoría no tiene nada visible, el
 * anuncio espera a que aparezca en vez de acomodarse en otro lado. Es preferible
 * a que se mueva, que es lo que se vino a arreglar. */
export function posicionDelAnuncio(categoriasDelNegocio: number) {
  return categoriasDelNegocio >= 2 ? 1 : 0;
}
