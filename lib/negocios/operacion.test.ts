import { describe, expect, it } from "vitest";

import { validarOperacionNegocio } from "./operacion";

describe("validarOperacionNegocio", () => {
  it("normaliza un horario programado y su tiempo de reserva", () => {
    const resultado = validarOperacionNegocio({
      reserva_minutos: "30",
      horario: {
        modo: "programado",
        dias: { lunes: [{ abre: "08:00", cierra: "12:00" }] },
      },
    });

    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) {
      expect(resultado.datos.reserva_minutos).toBe(30);
      expect(resultado.datos.horario.dias.lunes).toEqual([
        { abre: "08:00", cierra: "12:00" },
      ]);
    }
  });

  it("rechaza una duración y un horario inválidos", () => {
    const resultado = validarOperacionNegocio({
      reserva_minutos: 2,
      horario: {
        modo: "programado",
        dias: { martes: [{ abre: "09:00", cierra: "09:00" }] },
      },
    });

    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) {
      expect(resultado.errores.reserva_minutos).toBeTruthy();
      expect(resultado.errores.horario).toBeTruthy();
    }
  });
});
