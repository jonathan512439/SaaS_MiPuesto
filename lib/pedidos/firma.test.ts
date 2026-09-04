import { describe, expect, it } from "vitest";

import { construirFirmaCarrito } from "./firma";

describe("construirFirmaCarrito", () => {
  it("no depende del orden en que se agregaron los productos", () => {
    expect(construirFirmaCarrito({ b: 1, a: 2 })).toBe(construirFirmaCarrito({ a: 2, b: 1 }));
  });

  it("cambia cuando cambia una cantidad", () => {
    expect(construirFirmaCarrito({ a: 1 })).not.toBe(construirFirmaCarrito({ a: 2 }));
  });

  it("ignora los productos sin unidades", () => {
    expect(construirFirmaCarrito({ a: 1, b: 0 })).toBe(construirFirmaCarrito({ a: 1 }));
  });

  it("devuelve cadena vacía con el carrito vacío", () => {
    expect(construirFirmaCarrito({})).toBe("");
  });

  it("distingue dos productos de uno con el doble de unidades", () => {
    expect(construirFirmaCarrito({ a: 1, b: 1 })).not.toBe(construirFirmaCarrito({ a: 2 }));
  });
});
