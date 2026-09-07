import { describe, expect, it } from "vitest";

import { faltaParaReinicio, nivelDeUsoIa, porcentajeDeUso } from "./limites";

describe("medidores del nivel gratuito", () => {
  it("avisa antes de chocar contra el límite", () => {
    expect(nivelDeUsoIa(5, 15)).toBe("holgado");
    expect(nivelDeUsoIa(10, 15)).toBe("atencion");
    expect(nivelDeUsoIa(14, 15)).toBe("critico");
  });

  /* Cero significa «no sé cuánto es el límite». Inventar uno sería peor que no
     tenerlo, porque se decide con él. */
  it("no inventa un nivel cuando no se declaró el límite", () => {
    expect(nivelDeUsoIa(500, 0)).toBe("holgado");
    expect(porcentajeDeUso(500, 0)).toBe(0);
  });

  it("nunca pasa del cien por ciento", () => {
    expect(porcentajeDeUso(30, 15)).toBe(100);
    expect(porcentajeDeUso(7.5, 15)).toBe(50);
  });

  it("dice cuánto falta para el reinicio en palabras", () => {
    const ahora = new Date("2026-09-07T02:00:00.000Z");
    expect(faltaParaReinicio("2026-09-07T07:00:00.000Z", ahora)).toBe("en 5 hora(s)");
    expect(faltaParaReinicio("2026-09-07T02:30:00.000Z", ahora)).toBe("en 30 minuto(s)");
    expect(faltaParaReinicio("2026-09-07T04:20:00.000Z", ahora)).toBe("en 2 h 20 min");
    expect(faltaParaReinicio("2026-09-07T01:00:00.000Z", ahora)).toBe("en cualquier momento");
  });
});
