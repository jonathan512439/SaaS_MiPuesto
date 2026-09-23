/* A qué categoría va cada sección de una lista leída.
 *
 * La pantalla de revisión agrupa los productos por el título de sección que
 * traía la lista —«BEBIDAS», «ALMUERZOS»— y le propone al dueño un destino para
 * cada grupo, que él puede cambiar antes de confirmar. Esta función arma esa
 * propuesta, en este orden:
 *
 * 1. Si el negocio ya tiene una categoría que se llama igual, esa. Crear una
 *    segunda «Bebidas» es el error más fácil de cometer acá.
 * 2. Si no, la que la lectura sugirió para la mayoría de los productos de la
 *    sección: la categoría del negocio más parecida, aunque el nombre no
 *    coincida —«BEBIDAS» va a «Refrescos»—.
 * 3. Si no hay ninguna de las dos, crear una categoría con el título.
 *
 * Los productos sin título van sin categoría: no hay nada que proponer.
 *
 * Vive fuera del componente para poder probarla: es la parte de la pantalla que
 * decide dónde terminan cuarenta productos, y un error acá los reparte mal sin
 * que nada lo avise.
 */

export const CREAR = "crear";
export const SIN_CATEGORIA = "";
export const SIN_TITULO = "__sin_titulo__";

type ProductoConSeccion = {
  categoria: string;
  categoriaSugeridaId?: string | null;
};

export function proponerDestinos(
  productos: readonly ProductoConSeccion[],
  categorias: ReadonlyArray<{ id: string; nombre: string }>,
): { destinos: Record<string, string>; sugeridas: Set<string> } {
  const existentes = new Set(categorias.map(({ id }) => id));

  /* Cuántas veces sugirió la lectura cada categoría, por sección. Una sugerencia
     que apunta a una categoría que ya no existe —se borró mientras se leía la
     foto— no cuenta. */
  const votos = new Map<string, Map<string, number>>();
  for (const producto of productos) {
    const titulo = producto.categoria || SIN_TITULO;
    const sugerida = producto.categoriaSugeridaId;
    if (!sugerida || !existentes.has(sugerida)) continue;
    const conteo = votos.get(titulo) ?? new Map<string, number>();
    conteo.set(sugerida, (conteo.get(sugerida) ?? 0) + 1);
    votos.set(titulo, conteo);
  }

  const destinos: Record<string, string> = {};
  const sugeridas = new Set<string>();

  for (const producto of productos) {
    const titulo = producto.categoria || SIN_TITULO;
    if (destinos[titulo] !== undefined) continue;

    if (titulo === SIN_TITULO) {
      destinos[titulo] = SIN_CATEGORIA;
      continue;
    }

    const igual = categorias.find(
      (categoria) => categoria.nombre.trim().toLowerCase() === titulo.trim().toLowerCase(),
    );
    if (igual) {
      destinos[titulo] = igual.id;
      continue;
    }

    /* La más votada. Si empatan, la primera que apareció: es la del primer
       renglón de la sección, que es el que el dueño lee primero. */
    const conteo = votos.get(titulo);
    let elegida: string | null = null;
    let mejor = 0;
    for (const [id, cantidad] of conteo ?? []) {
      if (cantidad > mejor) {
        elegida = id;
        mejor = cantidad;
      }
    }

    if (elegida) {
      destinos[titulo] = elegida;
      sugeridas.add(titulo);
    } else {
      destinos[titulo] = CREAR;
    }
  }

  return { destinos, sugeridas };
}
