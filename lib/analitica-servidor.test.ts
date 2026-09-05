import { describe, expect, it } from "vitest";

import {
  calcularTendencia,
  contarPorProducto,
  describirTendencia,
  obtenerVentanasSemanales,
} from "./analitica-servidor";

const AHORA = new Date("2026-09-15T12:00:00Z");

describe("ventanas semanales", () => {
  it("arma dos semanas pegadas y del mismo largo", () => {
    const { actual, previa } = obtenerVentanasSemanales(AHORA);
    expect(actual.hasta).toBe(AHORA.toISOString());
    expect(actual.desde).toBe("2026-09-08T12:00:00.000Z");
    expect(previa.hasta).toBe(actual.desde);
    expect(previa.desde).toBe("2026-09-01T12:00:00.000Z");
  });
});

describe("tendencia", () => {
  it("informa subida, bajada e igualdad", () => {
    expect(calcularTendencia(120, 100)).toMatchObject({ diferencia: 20, porcentaje: 20, sentido: "sube" });
    expect(calcularTendencia(80, 100)).toMatchObject({ diferencia: -20, porcentaje: -20, sentido: "baja" });
    expect(calcularTendencia(100, 100)).toMatchObject({ diferencia: 0, sentido: "igual" });
  });

  /* Pasar de cero a uno no es «+100 %»: es un estreno, no una tendencia. */
  it("no inventa un porcentaje cuando la semana previa fue cero", () => {
    const tendencia = calcularTendencia(5, 0);
    expect(tendencia.porcentaje).toBeNull();
    expect(describirTendencia(tendencia)).toContain("la semana pasada no hubo");
  });

  it("describe la comparación en palabras", () => {
    expect(describirTendencia(calcularTendencia(120, 100))).toBe(
      "+20 · +20 % vs la semana pasada",
    );
    expect(describirTendencia(calcularTendencia(100, 100))).toBe(
      "Igual que la semana pasada",
    );
  });
});

describe("productos más vistos", () => {
  it("ordena por cantidad y corta en el límite", () => {
    const eventos = [
      { producto_id: "a" },
      { producto_id: "b" },
      { producto_id: "a" },
      { producto_id: "c" },
      { producto_id: "a" },
      { producto_id: "b" },
    ];
    expect(contarPorProducto(eventos, 2)).toEqual([
      { productoId: "a", total: 3 },
      { productoId: "b", total: 2 },
    ]);
  });

  it("descarta los eventos sin producto", () => {
    expect(contarPorProducto([{ producto_id: null }, { producto_id: null }])).toEqual([]);
  });

  it("desempata de forma estable", () => {
    expect(contarPorProducto([{ producto_id: "b" }, { producto_id: "a" }], 2)).toEqual([
      { productoId: "a", total: 1 },
      { productoId: "b", total: 1 },
    ]);
  });
});
