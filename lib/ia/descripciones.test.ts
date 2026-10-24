import { describe, expect, it } from "vitest";

import {
  LARGO_DESCRIPCION_SUGERIDA,
  MAXIMO_PARA_DESCRIBIR,
  descripcionesValidas,
  instruccionDescripciones,
  leerProductosParaDescribir,
  limpiarDescripcionSugerida,
} from "./descripciones";

describe("las descripciones que sugiere la IA", () => {
  it("la instrucción numera los productos y lleva sus datos", () => {
    const texto = instruccionDescripciones([
      { nombre: "Mochila escolar azul", categoria: "Mochilas escolares", datos: { Capacidad: "20 litros" } },
      { nombre: "Lonchera", categoria: "", datos: {} },
    ]);
    expect(texto).toContain("0. Mochila escolar azul (categoría Mochilas escolares) — Capacidad: 20 litros");
    expect(texto.endsWith("1. Lonchera")).toBe(true);
    expect(texto).toContain("NO agregues material");
  });

  it("vuelven por número, sin índices de más ni repetidos ni vacías", () => {
    const validas = descripcionesValidas(
      {
        descripciones: [
          { indice: 1, descripcion: "Lonchera para llevar el almuerzo al colegio." },
          { indice: 1, descripcion: "Otra para el mismo." },
          { indice: 5, descripcion: "Fuera de rango." },
          { indice: 0, descripcion: "   " },
          { indice: "x", descripcion: "Sin número." },
        ],
      },
      2,
    );
    expect([...validas]).toEqual([[1, "Lonchera para llevar el almuerzo al colegio."]]);
    expect(descripcionesValidas(null, 2).size).toBe(0);
  });

  it("se limpian los emojis, los signos de admiración y el largo", () => {
    expect(limpiarDescripcionSugerida("¡La mejor mochila!  🎒 para el cole")).toBe("La mejor mochila para el cole");
    const larga = limpiarDescripcionSugerida("palabra ".repeat(60));
    expect(larga.length).toBeLessThanOrEqual(LARGO_DESCRIPCION_SUGERIDA + 1);
    expect(larga.endsWith("…")).toBe(true);
  });

  /* Lo que manda el navegador se revisa en el servidor. */
  it("lo que llega del navegador se recorta o se rechaza entero", () => {
    expect(leerProductosParaDescribir([{ nombre: " Mochila  azul ", categoria: "Mochilas", datos: { Color: "Azul", Vacío: " ", Número: 3 } }])).toEqual([
      { nombre: "Mochila azul", categoria: "Mochilas", datos: { Color: "Azul" } },
    ]);
    expect(leerProductosParaDescribir([])).toBeNull();
    expect(leerProductosParaDescribir([{ nombre: "" }])).toBeNull();
    expect(leerProductosParaDescribir("Mochila")).toBeNull();
    expect(leerProductosParaDescribir(Array.from({ length: MAXIMO_PARA_DESCRIBIR + 1 }, () => ({ nombre: "x" })))).toBeNull();
  });
});
