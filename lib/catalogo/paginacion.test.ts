import { describe, expect, it } from "vitest";

import type { CategoriaPlantilla, ProductoPlantilla } from "../plantillas/tipos";
import { paginarCatalogo } from "./paginacion";

function producto(id: string): ProductoPlantilla {
  return {
    id,
    codigo: `PRD-${id}`,
    nombre: id,
    descripcion: "",
    precio: 10,
    precioOriginal: 10,
    tienePromocion: false,
    imagen: null,
    estado: "disponible",
    controlaStock: true,
    cantidadDisponible: 5,
    maximoCantidad: 5,
    accionWhatsapp: null,
  };
}

const CATEGORIAS: CategoriaPlantilla[] = [
  {
    id: "a",
    nombre: "A",
    productos: [producto("a1"), producto("a2")],
    subcategorias: [{ id: "a-sub", nombre: "Sub", productos: [producto("a3")] }],
  },
  { id: "b", nombre: "B", productos: [producto("b1"), producto("b2")] },
];

describe("paginarCatalogo", () => {
  it("pagina productos sin perder su categoría ni subcategoría", () => {
    const resultado = paginarCatalogo(CATEGORIAS, "", 2, 2);

    expect(resultado.totalProductos).toBe(5);
    expect(resultado.totalPaginas).toBe(3);
    expect(resultado.categorias).toHaveLength(2);
    expect(resultado.categorias[0].subcategorias?.[0].productos[0].id).toBe("a3");
    expect(resultado.categorias[1].productos[0].id).toBe("b1");
  });

  it("filtra una categoría y corrige una página fuera de rango", () => {
    const resultado = paginarCatalogo(CATEGORIAS, "b", 9, 1);

    expect(resultado.pagina).toBe(2);
    expect(resultado.totalProductos).toBe(2);
    expect(resultado.categorias[0].id).toBe("b");
    expect(resultado.categorias[0].productos[0].id).toBe("b2");
  });
});
