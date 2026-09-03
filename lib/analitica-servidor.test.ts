import { describe, expect, it } from "vitest";

import { obtenerInicioResumenSemanal } from "./analitica-servidor";

describe("resumen semanal", () => {
  it("calcula una ventana móvil de siete días en UTC", () => {
    expect(obtenerInicioResumenSemanal(new Date("2026-09-08T12:00:00Z"))).toBe(
      "2026-09-01T12:00:00.000Z",
    );
  });
});
