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

  /* Repartir cuatro dibujos entre siete rubros dejaba pares con el mismo fondo,
     que es justo lo que hacía que el patrón no dijera nada del negocio. */
  it("no repite dibujo entre dos rubros", () => {
    const dibujos = RUBROS.map((rubro) => patronDeRubro(rubro));
    expect(new Set(dibujos).size).toBe(RUBROS.length);
  });

  it("tiene un patrón para quien no eligió rubro", () => {
    expect(patronDeRubro(null)).toBe("rombos");
    expect(patronDeRubro("")).toBe("rombos");
    expect(patronDeRubro("panaderia")).toBe("rombos");
  });
});
