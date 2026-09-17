import { describe, expect, it } from "vitest";

import { fusionarCategorias } from "./fusionar";
import type { CategoriaPlantilla, ProductoPlantilla } from "./tipos";

/* «Un grupo no puede partirse entre dos tandas» es la primera de las seis reglas
 * del plan, y la única que no se puede cumplir dibujando: se cumple o no al
 * juntar lo que llega con lo que ya está. Si se hiciera mal, el catálogo no
 * fallaría —seguiría cargando— y mostraría «Bebidas» dos veces seguidas, que el
 * comprador lee como un error o como dos cosas distintas.
 */
function producto(id: string): ProductoPlantilla {
  return { id, nombre: id, precio: 10 } as ProductoPlantilla;
}

function categoria(
  id: string,
  productos: string[],
  subcategorias: Array<[string, string[]]> = [],
): CategoriaPlantilla {
  return {
    id,
    nombre: id,
    icono: "caja",
    productos: productos.map(producto),
    subcategorias: subcategorias.map(([sub, ids]) => ({
      id: sub,
      nombre: sub,
      productos: ids.map(producto),
    })),
  } as CategoriaPlantilla;
}

describe("juntar el tramo que llega con lo que ya está", () => {
  it("una categoría partida en dos tandas queda una sola vez", () => {
    const juntas = fusionarCategorias(
      [categoria("bebidas", ["uno", "dos"])],
      [categoria("bebidas", ["tres"])],
    );

    expect(juntas).toHaveLength(1);
    expect(juntas[0].productos.map(({ id }) => id)).toEqual(["uno", "dos", "tres"]);
  });

  it("una subcategoría partida en dos tandas tampoco se repite", () => {
    const juntas = fusionarCategorias(
      [categoria("bebidas", [], [["gaseosas", ["uno"]]])],
      [categoria("bebidas", [], [["gaseosas", ["dos"]]])],
    );

    expect(juntas[0].subcategorias).toHaveLength(1);
    expect(juntas[0].subcategorias![0].productos.map(({ id }) => id)).toEqual(["uno", "dos"]);
  });

  it("una subcategoría que aparece recién en la segunda tanda se agrega", () => {
    /* Pasa siempre: la tanda corta en medio de la categoría y los productos de
       «Jugos» entran todos en la siguiente. */
    const juntas = fusionarCategorias(
      [categoria("bebidas", [], [["gaseosas", ["uno"]]])],
      [categoria("bebidas", [], [["jugos", ["dos"]]])],
    );

    expect(juntas[0].subcategorias!.map(({ id }) => id)).toEqual(["gaseosas", "jugos"]);
  });

  it("una categoría nueva se agrega al final y en el orden en que llegó", () => {
    /* El catálogo ya viene ordenado del servidor. Reordenar acá sería inventar
       un segundo criterio que nadie escribió. */
    const juntas = fusionarCategorias(
      [categoria("bebidas", ["uno"])],
      [categoria("comidas", ["dos"]), categoria("postres", ["tres"])],
    );

    expect(juntas.map(({ id }) => id)).toEqual(["bebidas", "comidas", "postres"]);
  });

  it("un producto que llega dos veces se dibuja una", () => {
    /* Dos tandas pueden traer el mismo producto si el negocio cambió el orden
       entre una y otra. Repetido en la pantalla es peor que faltante: el
       comprador cree que hay dos. */
    const juntas = fusionarCategorias(
      [categoria("bebidas", ["uno", "dos"])],
      [categoria("bebidas", ["dos", "tres"])],
    );

    expect(juntas[0].productos.map(({ id }) => id)).toEqual(["uno", "dos", "tres"]);
  });

  it("no toca lo que ya estaba", () => {
    /* Se devuelve una copia: si mutara lo que recibió, React no vería el cambio
       —el arreglo sería el mismo objeto— y la pantalla no se volvería a dibujar
       con los productos nuevos. */
    const antes = [categoria("bebidas", ["uno"])];
    const juntas = fusionarCategorias(antes, [categoria("bebidas", ["dos"])]);

    expect(antes[0].productos).toHaveLength(1);
    expect(juntas).not.toBe(antes);
    expect(juntas[0]).not.toBe(antes[0]);
  });

  it("sin nada nuevo devuelve lo mismo", () => {
    const juntas = fusionarCategorias([categoria("bebidas", ["uno"])], []);
    expect(juntas.map(({ id }) => id)).toEqual(["bebidas"]);
  });
});
