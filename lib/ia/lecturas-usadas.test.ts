import { describe, expect, it } from "vitest";

import { mesEnCurso } from "./lecturas-usadas";

/* El mes con que se cuenta lo usado es el de Bolivia, como lo guarda la base.
   Con la hora de Greenwich, entre las 20:00 del último día y la medianoche la
   cuenta saltaba al mes siguiente y el dueño veía cero. */
describe("el mes en curso", () => {
  it("es el día 1 del mes en hora de Bolivia", () => {
    expect(mesEnCurso(new Date("2026-10-22T15:00:00Z"))).toBe("2026-10-01");
  });

  it("no salta de mes cuando en Greenwich ya es el día 1", () => {
    // 31 de octubre a las 21:00 en La Paz: en Greenwich ya es 1 de noviembre.
    expect(mesEnCurso(new Date("2026-11-01T01:00:00Z"))).toBe("2026-10-01");
  });

  it("cambia a la medianoche de Bolivia", () => {
    expect(mesEnCurso(new Date("2026-11-01T04:00:00Z"))).toBe("2026-11-01");
  });
});
