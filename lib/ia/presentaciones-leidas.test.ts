import { describe, expect, it } from "vitest";

import { MAXIMO_VARIANTES } from "../catalogo/variantes";
import { presentacionesDelRenglon } from "./presentaciones-leidas";

describe("las presentaciones que lee la IA", () => {
  it("un renglón con tres tamaños es un producto con tres presentaciones", () => {
    const leido = presentacionesDelRenglon({
      precio: 120,
      se_elige_por: "tamano",
      presentaciones: [
        { nombre: "Chica", precio: 120 },
        { nombre: "Mediana", precio: 150 },
        { nombre: "Grande", precio: 180 },
      ],
    });
    expect(leido.tipoPresentacion).toBe("tamano");
    expect(leido.precio).toBe(120);
    /* La que cuesta lo mismo que el producto va sin precio propio. */
    expect(leido.presentaciones).toEqual([
      { nombre: "Chica", precio: null, cantidad: null },
      { nombre: "Mediana", precio: 150, cantidad: null },
      { nombre: "Grande", precio: 180, cantidad: null },
    ]);
  });

  it("«opción» es el tipo genérico de presentación", () => {
    const leido = presentacionesDelRenglon({
      precio: 10,
      se_elige_por: "opcion",
      presentaciones: [{ nombre: "Rojo" }, { nombre: "Azul" }],
    });
    expect(leido.tipoPresentacion).toBe("presentacion");
  });

  it("sin precio del renglón, toma el de la primera presentación que tenga", () => {
    const leido = presentacionesDelRenglon({
      precio: 0,
      se_elige_por: "talla",
      presentaciones: [{ nombre: "S" }, { nombre: "M", precio: 70 }, { nombre: "L", precio: 80 }],
    });
    expect(leido.precio).toBe(70);
    expect(leido.presentaciones.map(({ precio }) => precio)).toEqual([null, null, 80]);
  });

  it("descarta nombres vacíos y repetidos, y una sola no es una elección", () => {
    const leido = presentacionesDelRenglon({
      precio: 50,
      se_elige_por: "talla",
      presentaciones: [{ nombre: " M " }, { nombre: "m" }, { nombre: "" }],
    });
    expect(leido.presentaciones).toEqual([]);
    expect(leido.tipoPresentacion).toBeNull();
    expect(leido.precio).toBe(50);
  });

  it("no pasa del máximo que acepta la base", () => {
    const leido = presentacionesDelRenglon({
      precio: 10,
      se_elige_por: "numero",
      presentaciones: Array.from({ length: MAXIMO_VARIANTES + 6 }, (_, i) => ({ nombre: String(30 + i) })),
    });
    expect(leido.presentaciones).toHaveLength(MAXIMO_VARIANTES);
  });

  it("«ninguna», un tipo inventado o una lista que no es lista dan un producto sin presentaciones", () => {
    for (const se_elige_por of ["ninguna", "color", undefined]) {
      const leido = presentacionesDelRenglon({
        precio: 25,
        se_elige_por,
        presentaciones: [{ nombre: "A" }, { nombre: "B" }],
      });
      expect(leido.presentaciones).toEqual([]);
    }
    expect(presentacionesDelRenglon({ precio: 25, se_elige_por: "talla", presentaciones: "S, M" }).presentaciones).toEqual([]);
  });

  it("un precio que no es precio no se guarda como precio propio", () => {
    const leido = presentacionesDelRenglon({
      precio: 30,
      se_elige_por: "tamano",
      presentaciones: [
        { nombre: "Chico", precio: -5 },
        { nombre: "Grande", precio: 1_000_000 },
      ],
    });
    expect(leido.presentaciones.map(({ precio }) => precio)).toEqual([null, null]);
  });
});
