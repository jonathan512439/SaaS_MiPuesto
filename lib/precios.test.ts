import { describe, expect, it } from "vitest";

import { calcularSubtotal, formatearPrecioBolivianos } from "./precios";

describe("formato de precios", () => {
  it("muestra la moneda boliviana sin decimales innecesarios", () => {
    expect(formatearPrecioBolivianos(45)).toBe("Bs 45");
  });

  it("conserva los centavos cuando existen", () => {
    expect(formatearPrecioBolivianos(45.5)).toBe("Bs 45,5");
  });
});

describe("subtotal de productos", () => {
  it("calcula cantidades en centavos para evitar errores decimales", () => {
    expect(
      calcularSubtotal([
        { precio: 10.1, cantidad: 2 },
        { precio: 5.25, cantidad: 1 },
      ]),
    ).toBe(25.45);
  });

  it("ignora cantidades y precios inválidos", () => {
    expect(
      calcularSubtotal([
        { precio: 10, cantidad: 0 },
        { precio: -1, cantidad: 2 },
        { precio: 5, cantidad: 1 },
      ]),
    ).toBe(5);
  });
});
