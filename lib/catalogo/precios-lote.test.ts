import { describe, expect, it } from "vitest";

import {
  AJUSTE_MAXIMO,
  AJUSTE_MINIMO,
  aplicarPorcentaje,
  PRECIO_MAXIMO,
  validarAjustePrecios,
} from "./precios-lote";

describe("aplicar un porcentaje", () => {
  it("sube y baja redondeando a dos decimales", () => {
    expect(aplicarPorcentaje(100, 10)).toBe(110);
    expect(aplicarPorcentaje(25.5, 10)).toBe(28.05);
    expect(aplicarPorcentaje(100, -20)).toBe(80);
  });

  it("redondea hacia arriba desde la mitad, como en el mostrador", () => {
    expect(aplicarPorcentaje(3.33, 10)).toBe(3.66);
    expect(aplicarPorcentaje(0.15, 10)).toBe(0.17);
  });

  /* Un precio en cero sería regalar el producto por un error de tipeo. */
  it("nunca deja un precio en cero", () => {
    expect(aplicarPorcentaje(0.01, -50)).toBe(0.01);
    expect(aplicarPorcentaje(0.02, -50)).toBe(0.01);
  });

  it("no pasa del precio máximo", () => {
    expect(aplicarPorcentaje(PRECIO_MAXIMO, 50)).toBe(PRECIO_MAXIMO);
  });
});

describe("validación del ajuste", () => {
  it("acepta un porcentaje con un decimal", () => {
    expect(validarAjustePrecios({ porcentaje: 12.5 })).toEqual({
      correcto: true,
      datos: { categoria_id: null, porcentaje: 12.5 },
    });
  });

  it("acepta acotar el ajuste a una categoría", () => {
    const resultado = validarAjustePrecios({ porcentaje: -5, categoria_id: "cat-1" });
    expect(resultado.correcto && resultado.datos.categoria_id).toBe("cat-1");
  });

  it.each([0, "", null, "hola", Number.NaN])("rechaza el porcentaje %o", (porcentaje) => {
    expect(validarAjustePrecios({ porcentaje }).correcto).toBe(false);
  });

  it("rechaza ajustes fuera del rango permitido", () => {
    expect(validarAjustePrecios({ porcentaje: AJUSTE_MAXIMO + 0.1 }).correcto).toBe(false);
    expect(validarAjustePrecios({ porcentaje: AJUSTE_MINIMO - 0.1 }).correcto).toBe(false);
  });

  it("rechaza más de un decimal", () => {
    expect(validarAjustePrecios({ porcentaje: 10.25 }).correcto).toBe(false);
  });
});
