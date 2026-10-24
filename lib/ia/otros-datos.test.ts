import { describe, expect, it } from "vitest";

import { MAXIMO_OTROS_DATOS, camposDeOtrosDatos } from "./otros-datos";

describe("los otros datos que lee la IA en un renglón", () => {
  it("quedan como las columnas de una planilla: el título y lo escrito", () => {
    expect(
      camposDeOtrosDatos([
        { nombre: "Color", valor: " Azul " },
        { nombre: "Capacidad (litros)", valor: "25" },
      ]),
    ).toEqual({ Color: "Azul", "Capacidad (litros)": "25" });
  });

  it("sin vacíos ni repetidos, y hasta el máximo", () => {
    expect(camposDeOtrosDatos([{ nombre: "Color", valor: "Azul" }, { nombre: "color", valor: "Rojo" }, { nombre: "", valor: "x" }, { nombre: "Material", valor: " " }])).toEqual({ Color: "Azul" });
    const muchos = Array.from({ length: MAXIMO_OTROS_DATOS + 3 }, (_, i) => ({ nombre: `Dato ${i}`, valor: "x" }));
    expect(Object.keys(camposDeOtrosDatos(muchos))).toHaveLength(MAXIMO_OTROS_DATOS);
  });

  /* Lo que el cliente no tiene que ver nunca, aunque el PDF lo traiga. */
  it("deja afuera costos, códigos y precios", () => {
    expect(camposDeOtrosDatos([{ nombre: "Costo", valor: "80" }, { nombre: "Código", valor: "A-12" }, { nombre: "Precio mayorista", valor: "70" }])).toEqual({});
  });

  it("lo que no es una lista no da nada", () => {
    expect(camposDeOtrosDatos(undefined)).toEqual({});
    expect(camposDeOtrosDatos("Color: azul")).toEqual({});
  });
});
