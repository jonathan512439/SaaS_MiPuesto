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

  /* Sin el campo —un negocio que nunca lo tocó, o una modalidad sin carrito—
     queda sin tope, que es lo de siempre. */
  it("el tope de unidades es opcional, y fuera de rango se rechaza", () => {
    const base = { reserva_minutos: 30, horario: { modo: "siempre_abierto" } };

    const sinTope = validarOperacionNegocio(base);
    expect(sinTope.correcto && sinTope.datos.tope_unidades_pedido).toBeNull();

    const conTope = validarOperacionNegocio({ ...base, tope_unidades_pedido: "12" });
    expect(conTope.correcto && conTope.datos.tope_unidades_pedido).toBe(12);

    const malo = validarOperacionNegocio({ ...base, tope_unidades_pedido: "0" });
    expect(malo.correcto).toBe(false);
    if (!malo.correcto) expect(malo.errores.tope_unidades_pedido).toBeTruthy();
  });
});
