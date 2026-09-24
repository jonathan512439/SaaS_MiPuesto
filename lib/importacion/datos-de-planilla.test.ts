import { describe, expect, it } from "vitest";

import type { Atributo } from "../catalogo/atributos";
import { valoresDesdePlanilla } from "./datos-de-planilla";

function atributo(parcial: Partial<Atributo> & Pick<Atributo, "clave" | "nombre" | "tipo">): Atributo {
  return {
    unidad: null,
    opciones: [],
    obligatorio: false,
    enTarjeta: false,
    enResumen: true,
    ...parcial,
  };
}

const FOCOS: Atributo[] = [
  atributo({ clave: "potencia", nombre: "Potencia", tipo: "numero", unidad: "W" }),
  atributo({ clave: "casquillo", nombre: "Casquillo", tipo: "opcion", opciones: ["E27", "E14", "GU10"] }),
  atributo({ clave: "color_de_luz", nombre: "Color de luz", tipo: "opcion", opciones: ["Cálida", "Fría"] }),
  atributo({ clave: "regulable", nombre: "Regulable", tipo: "si_no" }),
  atributo({ clave: "marca", nombre: "Marca", tipo: "texto" }),
];

describe("los datos de la planilla, cruzados con los campos de la categoría", () => {
  it("reconoce el campo por el título, con unidad, sin tildes ni mayúsculas", () => {
    const { valores, problemas } = valoresDesdePlanilla(FOCOS, {
      "Potencia (W)": "9",
      CASQUILLO: "e27",
      "color de luz": "calida",
      Regulable: "Sí",
      Marca: "Philips",
    });
    expect(problemas).toEqual([]);
    expect(valores).toEqual({
      potencia: 9,
      casquillo: "E27",
      color_de_luz: "Cálida",
      regulable: true,
      marca: "Philips",
    });
  });

  it("también por la clave, que es lo que trae una planilla hecha por un sistema", () => {
    expect(valoresDesdePlanilla(FOCOS, { color_de_luz: "Fría" }).valores).toEqual({ color_de_luz: "Fría" });
  });

  it("un número con su unidad o con coma decimal se lee igual", () => {
    expect(valoresDesdePlanilla(FOCOS, { Potencia: "9 W" }).valores).toEqual({ potencia: 9 });
    expect(valoresDesdePlanilla(FOCOS, { Potencia: "7,5" }).valores).toEqual({ potencia: 7.5 });
  });

  it("sí y no, como los escribe la gente", () => {
    for (const si of ["Sí", "si", "SI", "x", "1"]) {
      expect(valoresDesdePlanilla(FOCOS, { Regulable: si }).valores).toEqual({ regulable: true });
    }
    for (const no of ["No", "no", "0"]) {
      expect(valoresDesdePlanilla(FOCOS, { Regulable: no }).valores).toEqual({ regulable: false });
    }
  });

  it("lo que no calza se deja afuera y se dice, sin perder lo demás", () => {
    const { valores, problemas } = valoresDesdePlanilla(FOCOS, {
      Casquillo: "E40",
      Regulable: "a veces",
      Potencia: "mucha",
      Marca: "Osram",
    });
    expect(valores).toEqual({ marca: "Osram" });
    expect(problemas).toHaveLength(3);
    expect(problemas[0]).toContain("E27, E14, GU10");
    expect(problemas[0]).toContain("E40");
  });

  it("una columna que no es campo de esta categoría no es un error", () => {
    expect(valoresDesdePlanilla(FOCOS, { Temporada: "Verano", Código: "PRD-1" })).toEqual({
      valores: {},
      problemas: [],
    });
  });

  it("un texto demasiado largo se avisa", () => {
    expect(valoresDesdePlanilla(FOCOS, { Marca: "x".repeat(81) }).problemas).toHaveLength(1);
  });
});
