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
    const resultado = paginarCatalogo(CATEGORIAS, "", 2, "", 2);

    expect(resultado.totalProductos).toBe(5);
    expect(resultado.totalPaginas).toBe(3);
    expect(resultado.categorias).toHaveLength(2);
    expect(resultado.categorias[0].subcategorias?.[0].productos[0].id).toBe("a3");
    expect(resultado.categorias[1].productos[0].id).toBe("b1");
  });

  it("filtra una categoría y corrige una página fuera de rango", () => {
    const resultado = paginarCatalogo(CATEGORIAS, "b", 9, "", 1);

    expect(resultado.pagina).toBe(2);
    expect(resultado.totalProductos).toBe(2);
    expect(resultado.categorias[0].id).toBe("b");
    expect(resultado.categorias[0].productos[0].id).toBe("b2");
  });
});

function conNombre(id: string, nombre: string, descripcion = ""): ProductoPlantilla {
  return { ...producto(id), nombre, descripcion };
}

const TIENDA: CategoriaPlantilla[] = [
  {
    id: "ropa",
    nombre: "Ropa",
    productos: [
      conNombre("p1", "Polera de algodón roja"),
      conNombre("p2", "Camisa blanca", "Manga larga, algodón peinado"),
    ],
  },
  {
    id: "bebidas",
    nombre: "Bebidas",
    productos: [conNombre("p3", "Café pasado"), conNombre("p4", "Té helado")],
  },
];

describe("búsqueda dentro del catálogo", () => {
  it("encuentra sin tildes lo que está escrito con tildes", () => {
    const { totalProductos, categorias } = paginarCatalogo(TIENDA, "", 1, "cafe");
    expect(totalProductos).toBe(1);
    expect(categorias[0].productos[0].nombre).toBe("Café pasado");
  });

  it("ignora mayúsculas y espacios sobrantes", () => {
    expect(paginarCatalogo(TIENDA, "", 1, "  CAMISA  ").totalProductos).toBe(1);
  });

  it("exige todas las palabras pero no su orden", () => {
    expect(paginarCatalogo(TIENDA, "", 1, "roja polera").totalProductos).toBe(1);
    expect(paginarCatalogo(TIENDA, "", 1, "polera blanca").totalProductos).toBe(0);
  });

  it("también busca dentro de la descripción", () => {
    expect(paginarCatalogo(TIENDA, "", 1, "peinado").totalProductos).toBe(1);
  });

  it("se combina con el filtro de categoría", () => {
    expect(paginarCatalogo(TIENDA, "bebidas", 1, "algodon").totalProductos).toBe(0);
    expect(paginarCatalogo(TIENDA, "ropa", 1, "algodon").totalProductos).toBe(2);
  });

  it("sin término devuelve el catálogo entero y lo declara", () => {
    const resultado = paginarCatalogo(TIENDA, "", 1, "   ");
    expect(resultado.totalProductos).toBe(4);
    expect(resultado.hayBusqueda).toBe(false);
  });

  it("declara que hubo búsqueda aunque no haya resultados", () => {
    const resultado = paginarCatalogo(TIENDA, "", 1, "zapato");
    expect(resultado.totalProductos).toBe(0);
    expect(resultado.hayBusqueda).toBe(true);
  });
});
