import { describe, expect, it } from "vitest";

import { PLAN_PRUEBA, PLANES } from "../planes";
import {
  cupoDeLecturas,
  describirLecturasQueQuedan,
  gastarLectura,
  periodoDeLecturas,
} from "./cupo-de-lecturas";

const catalogo = PLANES.find(({ id }) => id === "catalogo")!;

describe("cupo de lecturas", () => {
  it("resta lo usado del cupo del plan, no del techo técnico", () => {
    expect(cupoDeLecturas("catalogo", 3)).toEqual({
      quedan: catalogo.lecturasPorMes - 3,
      total: catalogo.lecturasPorMes,
      prueba: false,
    });
  });

  it("nunca baja de cero", () => {
    expect(cupoDeLecturas("catalogo", 999).quedan).toBe(0);
    expect(gastarLectura(cupoDeLecturas("catalogo", catalogo.lecturasPorMes)).quedan).toBe(0);
  });

  it("gastar una resta una", () => {
    expect(gastarLectura(cupoDeLecturas("catalogo", 0)).quedan).toBe(catalogo.lecturasPorMes - 1);
  });

  it("a la prueba no le habla de meses", () => {
    const cupo = cupoDeLecturas(PLAN_PRUEBA.id, 0);
    expect(cupo).toMatchObject({ total: PLAN_PRUEBA.lecturasPorMes, prueba: true });
    expect(periodoDeLecturas(cupo)).toBe("de tu prueba");
    expect(describirLecturasQueQuedan(gastarLectura(cupo))).not.toMatch(/mes|día 1/);
  });

  it("en cero dice qué pasa después", () => {
    expect(describirLecturasQueQuedan(cupoDeLecturas("catalogo", 999))).toContain("Vuelven el día 1");
    expect(describirLecturasQueQuedan(cupoDeLecturas(PLAN_PRUEBA.id, 999))).toContain("elegir tu plan");
  });

  it("concuerda en singular", () => {
    expect(describirLecturasQueQuedan(cupoDeLecturas("catalogo", catalogo.lecturasPorMes - 1))).toMatch(
      /^Te queda 1 de /,
    );
  });
});
