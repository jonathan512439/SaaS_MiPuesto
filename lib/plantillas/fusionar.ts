import type { CategoriaPlantilla } from "./tipos";

/* Juntar el tramo que acaba de llegar con lo que ya está en pantalla.
 *
 * Es la regla que el plan dejó escrita primero y con mayúsculas: **un grupo no
 * puede partirse entre dos tandas**. Si «Bebidas» tiene quince productos y la
 * tanda corta a los doce, agregar la siguiente como si fuera una categoría nueva
 * dibujaría «Bebidas» dos veces, una debajo de la otra, con su título y su
 * cuenta repetidos. El comprador no lee eso como «hay más»: lo lee como un
 * error, o peor, cree que son dos cosas distintas.
 *
 * Lo mismo con las subcategorías adentro: «Gaseosas» partida en dos deja dos
 * subtítulos iguales separados por tres productos.
 *
 * Así que fusionar no es concatenar. Cada categoría que llega se busca por su
 * `id` entre las que ya están; si estaba, sus productos se suman a los de ella y
 * sus subgrupos a los subgrupos que coincidan. Solo lo que de verdad es nuevo se
 * agrega al final, y **en el orden en que llegó**: el catálogo ya viene ordenado
 * del servidor y reordenarlo acá sería inventar un criterio segundo.
 */
export function fusionarCategorias(
  actuales: ReadonlyArray<CategoriaPlantilla>,
  nuevas: ReadonlyArray<CategoriaPlantilla>,
): CategoriaPlantilla[] {
  const resultado = actuales.map((categoria) => ({
    ...categoria,
    productos: [...categoria.productos],
    subcategorias: (categoria.subcategorias ?? []).map((sub) => ({
      ...sub,
      productos: [...sub.productos],
    })),
  }));

  const porId = new Map(resultado.map((categoria) => [categoria.id, categoria]));

  for (const llegada of nuevas) {
    const existente = porId.get(llegada.id);

    if (!existente) {
      resultado.push({
        ...llegada,
        productos: [...llegada.productos],
        subcategorias: (llegada.subcategorias ?? []).map((sub) => ({
          ...sub,
          productos: [...sub.productos],
        })),
      });
      porId.set(llegada.id, resultado[resultado.length - 1]);
      continue;
    }

    /* Se descartan los que ya están. Dos tandas pueden traer el mismo producto
       si el negocio cambió el orden entre una y otra, y un producto repetido en
       la pantalla es peor que uno que falta: el comprador cree que hay dos. */
    const yaEstan = new Set(existente.productos.map(({ id }) => id));
    for (const producto of llegada.productos) {
      if (!yaEstan.has(producto.id)) existente.productos.push(producto);
    }

    for (const subLlegada of llegada.subcategorias ?? []) {
      const subExistente = (existente.subcategorias ?? []).find(({ id }) => id === subLlegada.id);

      if (!subExistente) {
        existente.subcategorias = [
          ...(existente.subcategorias ?? []),
          { ...subLlegada, productos: [...subLlegada.productos] },
        ];
        continue;
      }

      const yaEstanEnSub = new Set(subExistente.productos.map(({ id }) => id));
      for (const producto of subLlegada.productos) {
        if (!yaEstanEnSub.has(producto.id)) subExistente.productos.push(producto);
      }
    }
  }

  return resultado;
}
