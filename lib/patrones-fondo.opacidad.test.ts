import { describe, expect, it } from "vitest";

import {
  OPACIDAD_PATRON_PREDETERMINADA,
  PASOS_OPACIDAD_PATRON,
  acotarOpacidad,
} from "./patrones-fondo";

/* El número viaja como atributo y la hoja tiene **una regla por paso**. Si acá
   saliera un valor que no está en la tabla, el atributo no engancharía ninguna
   regla y el catálogo caería al valor de reserva sin que nada avisara: no lo
   atrapa el compilador ni el lint, se ve mirando el fondo. */
describe("acotarOpacidad", () => {
  it("devuelve siempre uno de los pasos que la hoja sabe dibujar", () => {
    for (let valor = -20; valor <= 60; valor += 1) {
      expect(PASOS_OPACIDAD_PATRON).toContain(acotarOpacidad(valor));
    }
  });

  it("respeta el paso exacto cuando ya es uno", () => {
    for (const paso of PASOS_OPACIDAD_PATRON) expect(acotarOpacidad(paso)).toBe(paso);
  });

  it("lleva al paso más cercano lo que quedó entre dos", () => {
    expect(acotarOpacidad(11)).toBe(12);
    expect(acotarOpacidad(13)).toBe(12);
    expect(acotarOpacidad(1)).toBe(0);
  });

  it("acota lo que se fue de rango en vez de dibujarlo", () => {
    expect(acotarOpacidad(31)).toBe(30);
    expect(acotarOpacidad(500)).toBe(30);
    expect(acotarOpacidad(-1)).toBe(0);
  });

  /* Un negocio anterior a la columna llega sin el dato y tiene que seguir
     viéndose igual: la fase no le cambia el catálogo a nadie por una migración. */
  it("cae a lo que se veía antes cuando no hay dato", () => {
    for (const vacio of [null, undefined, "12", Number.NaN, {}]) {
      expect(acotarOpacidad(vacio)).toBe(OPACIDAD_PATRON_PREDETERMINADA);
    }
  });
});
