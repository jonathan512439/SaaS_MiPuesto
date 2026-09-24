import { describe, expect, it } from "vitest";

import {
  MAXIMO_CATEGORIAS_PARA_IA,
  NINGUNA_CATEGORIA,
  categoriaQueEligio,
  categoriasParaElegir,
  esquemaProducto,
  instruccionProducto,
} from "./instrucciones";

const CATEGORIAS = [
  { id: "c1", nombre: "Refrescos" },
  { id: "c2", nombre: "Hamburguesas" },
  { id: "c3", nombre: "Postres " },
];

describe("la categoría que se elige desde la foto de un producto", () => {
  it("el esquema solo admite una categoría del negocio o ninguna", () => {
    const esquema = esquemaProducto(["Refrescos", "Hamburguesas"]);
    expect(esquema.properties.categoria).toEqual({
      type: "string",
      enum: ["Refrescos", "Hamburguesas", NINGUNA_CATEGORIA],
    });
  });

  it("sin categorías el campo queda libre y la instrucción pide dejarlo vacío", () => {
    expect(esquemaProducto([]).properties.categoria).toEqual({ type: "string" });
    expect(instruccionProducto([])).toContain('categoria: devuelve ""');
  });

  it("la instrucción lista las categorías del negocio, una por renglón", () => {
    const instruccion = instruccionProducto(["Refrescos", "Hamburguesas"]);
    expect(instruccion).toContain("  - Refrescos\n  - Hamburguesas");
    expect(instruccion).toContain(NINGUNA_CATEGORIA);
    expect(instruccion).toContain("No inventes una categoría nueva");
  });

  it("devuelve la categoría elegida, sin importar mayúsculas ni espacios", () => {
    expect(categoriaQueEligio("Refrescos", CATEGORIAS)?.id).toBe("c1");
    expect(categoriaQueEligio(" hamburguesas ", CATEGORIAS)?.id).toBe("c2");
    expect(categoriaQueEligio("Postres", CATEGORIAS)?.id).toBe("c3");
  });

  it("«ninguna», vacío o una categoría que no existe dejan el producto sin categoría", () => {
    expect(categoriaQueEligio(NINGUNA_CATEGORIA, CATEGORIAS)).toBeNull();
    expect(categoriaQueEligio("", CATEGORIAS)).toBeNull();
    expect(categoriaQueEligio(undefined, CATEGORIAS)).toBeNull();
    /* El modelo se salió de la lista: se ignora en vez de crear nada. */
    expect(categoriaQueEligio("Bebidas", CATEGORIAS)).toBeNull();
  });

  it("los nombres que se mandan no se repiten, no van vacíos y no chocan con «ninguna»", () => {
    expect(categoriasParaElegir(["Bebidas", "bebidas ", "", "  ", "(Ninguna)", "Postres"])).toEqual([
      "Bebidas",
      "Postres",
    ]);
  });

  it("se mandan como máximo las primeras, en el orden del dueño", () => {
    const muchas = Array.from({ length: MAXIMO_CATEGORIAS_PARA_IA + 20 }, (_, i) => `Categoría ${i}`);
    const elegibles = categoriasParaElegir(muchas);
    expect(elegibles).toHaveLength(MAXIMO_CATEGORIAS_PARA_IA);
    expect(elegibles[0]).toBe("Categoría 0");
  });
});
