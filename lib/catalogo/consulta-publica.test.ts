import { describe, expect, it } from "vitest";

import {
  calcularRango,
  calcularTotalPaginas,
  construirRutaCatalogo,
  extraerTerminos,
  leerFiltrosCatalogo,
  MAXIMO_TERMINOS,
  normalizarBusqueda,
  PRODUCTOS_PUBLICOS_POR_PAGINA,
} from "./consulta-publica";

const CATEGORIAS = [{ id: "cat-1" }, { id: "cat-2" }];

describe("normalización de búsqueda", () => {
  it("quita tildes y mayúsculas", () => {
    expect(normalizarBusqueda("Café")).toBe("cafe");
    expect(normalizarBusqueda("  CAMISA  ")).toBe("camisa");
    expect(normalizarBusqueda("Algodón")).toBe("algodon");
  });
});

describe("extracción de términos", () => {
  it("separa palabras y conserva el orden de escritura", () => {
    expect(extraerTerminos("polera roja")).toEqual(["polera", "roja"]);
  });

  /* Los comodines de `ilike` tienen que morir acá: si pasan a la consulta, un
     `%` convierte cualquier búsqueda en «todo el catálogo». */
  it("descarta comodines y signos", () => {
    expect(extraerTerminos("%_ polera; (roja) *")).toEqual(["polera", "roja"]);
    expect(extraerTerminos("100%")).toEqual(["100"]);
  });

  it("no devuelve nada cuando solo hay espacios o signos", () => {
    expect(extraerTerminos("   ")).toEqual([]);
    expect(extraerTerminos("%%%")).toEqual([]);
  });

  it("acota la cantidad de términos", () => {
    expect(extraerTerminos("uno dos tres cuatro cinco seis siete")).toHaveLength(
      MAXIMO_TERMINOS,
    );
  });

  it("acota el largo antes de normalizar", () => {
    expect(extraerTerminos("a".repeat(500)).join("")).toHaveLength(60);
  });
});

describe("lectura de filtros", () => {
  it("acepta una categoría que existe y descarta una inventada", () => {
    expect(leerFiltrosCatalogo({ categoria: "cat-2" }, CATEGORIAS).categoria).toBe("cat-2");
    expect(leerFiltrosCatalogo({ categoria: "cat-9" }, CATEGORIAS).categoria).toBe("");
  });

  it("cae en la página uno ante cualquier valor raro", () => {
    for (const pagina of ["0", "-3", "hola", "", "1.5"]) {
      expect(leerFiltrosCatalogo({ pagina }, CATEGORIAS).pagina).toBe(1);
    }
    expect(leerFiltrosCatalogo({ pagina: "4" }, CATEGORIAS).pagina).toBe(4);
  });

  it("toma el primer valor cuando el parámetro llega repetido", () => {
    expect(leerFiltrosCatalogo({ buscar: ["polera", "otra"] }, CATEGORIAS).busqueda).toBe(
      "polera",
    );
  });
});

describe("rango y páginas", () => {
  it("pide el tramo correcto a la base", () => {
    expect(calcularRango(1)).toEqual({ desde: 0, hasta: PRODUCTOS_PUBLICOS_POR_PAGINA - 1 });
    expect(calcularRango(3, 12)).toEqual({ desde: 24, hasta: 35 });
  });

  it("nunca informa menos de una página", () => {
    expect(calcularTotalPaginas(0)).toBe(1);
    expect(calcularTotalPaginas(12, 12)).toBe(1);
    expect(calcularTotalPaginas(13, 12)).toBe(2);
    expect(calcularTotalPaginas(300, 12)).toBe(25);
  });
});

describe("construcción de la dirección", () => {
  it("deja la dirección limpia cuando no hay filtros", () => {
    expect(construirRutaCatalogo("mi-negocio", {})).toBe("/mi-negocio");
    expect(construirRutaCatalogo("mi-negocio", { pagina: 1 })).toBe("/mi-negocio");
  });

  it("arma la dirección desde cero y no acumula", () => {
    expect(
      construirRutaCatalogo("mi-negocio", { categoria: "cat-1", busqueda: " polera " }),
    ).toBe("/mi-negocio?categoria=cat-1&buscar=polera");
    expect(construirRutaCatalogo("mi-negocio", { pagina: 3 })).toBe("/mi-negocio?pagina=3");
  });
});
