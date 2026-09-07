import { describe, expect, it } from "vitest";

import { patronDeRubro } from "./patrones-fondo";
import { RUBROS } from "./negocios/rubros";

describe("patrón del fondo", () => {
  /* Un rubro sin patrón dejaría el fondo liso solo para algunos negocios, y esa
     diferencia se lee como un error de carga, no como una decisión. */
  it("da un patrón a cada rubro que existe", () => {
    for (const rubro of RUBROS) {
      expect(patronDeRubro(rubro)).toBeTruthy();
    }
  });

  it("distingue una ferretería de una barbería", () => {
    expect(patronDeRubro("ferreteria")).not.toBe(patronDeRubro("belleza"));
  });

  it("tiene un patrón para quien no eligió rubro", () => {
    expect(patronDeRubro(null)).toBe("trama");
    expect(patronDeRubro("")).toBe("trama");
    expect(patronDeRubro("panaderia")).toBe("trama");
  });
});
