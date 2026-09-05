import { describe, expect, it } from "vitest";

import {
  DIAS_PAPELERA,
  describirPlazo,
  diasRestantesEnPapelera,
  fechaDeCorte,
  venciEnPapelera,
} from "./papelera";

const AHORA = new Date("2026-03-01T12:00:00.000Z");

function haceDias(dias: number): string {
  return new Date(AHORA.getTime() - dias * 24 * 60 * 60 * 1000).toISOString();
}

describe("papelera de productos", () => {
  it("cuenta los días enteros que faltan para la purga", () => {
    expect(diasRestantesEnPapelera(haceDias(0), AHORA)).toBe(DIAS_PAPELERA);
    expect(diasRestantesEnPapelera(haceDias(29), AHORA)).toBe(1);
    expect(diasRestantesEnPapelera(haceDias(30), AHORA)).toBe(0);
  });

  /* Media hora de vida sigue siendo un día en pantalla: decirle «0 días» a
     alguien que todavía puede recuperar su producto lo empuja a no intentarlo. */
  it("redondea hacia arriba mientras quede tiempo", () => {
    const casiVencido = new Date(
      AHORA.getTime() - (DIAS_PAPELERA * 24 - 1) * 60 * 60 * 1000,
    ).toISOString();
    expect(diasRestantesEnPapelera(casiVencido, AHORA)).toBe(1);
    expect(venciEnPapelera(casiVencido, AHORA)).toBe(false);
    expect(describirPlazo(casiVencido, AHORA)).toBe("Queda 1 día para recuperarlo");
  });

  it("da por vencido lo que pasó el plazo", () => {
    expect(venciEnPapelera(haceDias(31), AHORA)).toBe(true);
    expect(describirPlazo(haceDias(31), AHORA)).toBe("Se borra en la próxima limpieza");
    expect(describirPlazo(haceDias(2), AHORA)).toBe("Quedan 28 días para recuperarlo");
  });

  it("corta exactamente en el plazo declarado", () => {
    expect(fechaDeCorte(AHORA)).toBe(haceDias(DIAS_PAPELERA));
  });
});
