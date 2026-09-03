import { describe, expect, it } from "vitest";

import { calcularCantidadDisponible, limitarCantidadReserva } from "./reservas";

describe("cantidades reservables", () => {
  it("resta las reservas sin alterar las existencias físicas", () => {
    expect(
      calcularCantidadDisponible({
        controlaStock: true,
        cantidadStock: 10,
        cantidadReservada: 3,
      }),
    ).toBe(7);
  });

  it("no limita productos que no controlan stock", () => {
    expect(
      calcularCantidadDisponible({
        controlaStock: false,
        cantidadStock: null,
        cantidadReservada: 0,
      }),
    ).toBeNull();
  });

  it("falla de forma segura con datos inconsistentes y limita a 99", () => {
    expect(
      calcularCantidadDisponible({
        controlaStock: true,
        cantidadStock: 2,
        cantidadReservada: 4,
      }),
    ).toBe(0);
    expect(limitarCantidadReserva(120, 150)).toBe(99);
    expect(limitarCantidadReserva(4, 2)).toBe(2);
  });
});
