import { describe, expect, it } from "vitest";

import { esTipoNegocio, obtenerComportamientoModalidad } from "./modalidades";

describe("modalidades del catálogo", () => {
  it.each([
    ["catalogo_estatico", "solo_lectura"],
    ["catalogo_cta", "accion_individual"],
    ["tienda_virtual", "carrito"],
  ] as const)("convierte %s en el comportamiento %s", (tipo, accion) => {
    expect(esTipoNegocio(tipo)).toBe(true);
    expect(obtenerComportamientoModalidad(tipo).accion).toBe(accion);
  });

  it("falla de forma segura ante una modalidad desconocida", () => {
    expect(esTipoNegocio("modo_inventado")).toBe(false);
    expect(obtenerComportamientoModalidad("modo_inventado")).toMatchObject({
      tipo: "catalogo_estatico",
      accion: "solo_lectura",
    });
  });
});
