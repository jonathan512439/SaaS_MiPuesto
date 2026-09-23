import { describe, expect, it } from "vitest";

import { PLANES, cupoDelPlan } from "../planes";
import {
  CUOTA_REPARTIBLE_POR_DIA,
  LIMITES_GEMINI,
  TOPE_FOTOS_POR_DIA,
  TOPE_FOTOS_POR_MES,
} from "./limites";

/* La lectura de fotos viene con el plan, así que ya no hay un número fijo de
   negocios que la tengan. Lo que se controla es la suma: cuántos negocios de
   cada plan entran en la cuota diaria antes de tener que pasar al nivel pago de
   Google. Si alguien sube el cupo de un plan o baja el límite de Google, esto
   tiene que seguir dando un número razonable, o avisarlo acá. */
describe("reparto de la cuota diaria", () => {
  it("lo repartible deja margen y no llega al último pedido del día", () => {
    expect(CUOTA_REPARTIBLE_POR_DIA).toBeLessThanOrEqual(LIMITES_GEMINI.porDia * 0.85);
    expect(CUOTA_REPARTIBLE_POR_DIA).toBeGreaterThan(0);
  });

  it("un solo negocio no puede llevarse más de una décima parte del día", () => {
    expect(TOPE_FOTOS_POR_DIA * 10).toBeLessThanOrEqual(CUOTA_REPARTIBLE_POR_DIA);
  });

  /* El tope diario de cada plan no puede pasar el techo del sistema: el techo
     es el que acota el accidente, y un plan por encima lo volvería decorativo. */
  it("ningún plan pide por día más que el techo", () => {
    for (const plan of PLANES) {
      expect(cupoDelPlan(plan.id, TOPE_FOTOS_POR_DIA).diario).toBeLessThanOrEqual(TOPE_FOTOS_POR_DIA);
    }
  });

  /* Con la cuota gratuita tienen que entrar muchos más negocios que los diez de
     antes: si esta cuenta baja de veinte, la herramienta con el plan deja de ser
     sostenible y hay que decidir antes de vender más. */
  it("entran al menos veinte negocios del plan más caro en la cuota gratuita", () => {
    for (const plan of PLANES) {
      const diario = cupoDelPlan(plan.id, TOPE_FOTOS_POR_DIA).diario;
      expect(Math.floor(CUOTA_REPARTIBLE_POR_DIA / diario)).toBeGreaterThanOrEqual(20);
    }
  });

  /* Un tope diario que no alcanza para llegar al mensual convierte la promesa
     comercial en una que no se puede cumplir ni usando la herramienta todos los
     días del mes. */
  it("permite llegar al tope mensual dentro del mes", () => {
    expect(TOPE_FOTOS_POR_DIA * 28).toBeGreaterThanOrEqual(TOPE_FOTOS_POR_MES);
    for (const plan of PLANES) {
      const cupo = cupoDelPlan(plan.id, TOPE_FOTOS_POR_DIA);
      expect(cupo.diario * 28).toBeGreaterThanOrEqual(cupo.mensual);
    }
  });
});
