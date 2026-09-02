import { describe, expect, it } from "vitest";

import { formatearPrecioBolivianos } from "./precios";

describe("formato de precios", () => {
  it("muestra la moneda boliviana sin decimales innecesarios", () => {
    expect(formatearPrecioBolivianos(45)).toBe("Bs 45");
  });

  it("conserva los centavos cuando existen", () => {
    expect(formatearPrecioBolivianos(45.5)).toBe("Bs 45,5");
  });
});
