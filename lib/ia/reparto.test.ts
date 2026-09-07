import { describe, expect, it } from "vitest";

import {
  LIMITES_GEMINI,
  NEGOCIOS_CON_HERRAMIENTA,
  TOPE_FOTOS_POR_DIA,
  TOPE_FOTOS_POR_MES,
} from "./limites";

/* El tope diario se reparte entre los negocios que pueden tener la herramienta
   encendida. Si alguien sube la cantidad de negocios, o baja el límite de
   Google, o toca el tope a mano, la suma puede pasarse sin que nada avise: el
   sistema seguiría autorizando y Google empezaría a rechazar, que es la peor
   forma de enterarse. */
describe("reparto de la cuota diaria", () => {
  it("todos los negocios juntos no pueden pasarse del día", () => {
    expect(TOPE_FOTOS_POR_DIA * NEGOCIOS_CON_HERRAMIENTA).toBeLessThanOrEqual(
      LIMITES_GEMINI.porDia,
    );
  });

  it("deja margen y no reparte hasta el último pedido", () => {
    const repartido = TOPE_FOTOS_POR_DIA * NEGOCIOS_CON_HERRAMIENTA;
    expect(repartido).toBeLessThanOrEqual(LIMITES_GEMINI.porDia * 0.85);
  });

  /* Un tope diario que no alcanza para llegar al mensual convierte la promesa
     comercial en una que no se puede cumplir ni usando la herramienta todos los
     días del mes. */
  it("permite llegar al tope mensual dentro del mes", () => {
    expect(TOPE_FOTOS_POR_DIA * 28).toBeGreaterThanOrEqual(TOPE_FOTOS_POR_MES);
  });

  it("no reparte cero", () => {
    expect(TOPE_FOTOS_POR_DIA).toBeGreaterThan(0);
  });
});
