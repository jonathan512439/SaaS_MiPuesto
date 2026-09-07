import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
    expect(patronDeRubro(null)).toBe("comercio");
    expect(patronDeRubro("")).toBe("comercio");
    expect(patronDeRubro("panaderia")).toBe("comercio");
  });
});

/* El nombre del patrón vive en TypeScript y el dibujo en CSS, apuntando a un
   archivo. Si alguno de los tres se desalinea no falla nada: el fondo sale liso
   y hay que descubrirlo mirando un catálogo. */
describe("los dibujos del patrón", () => {
  const raiz = join(import.meta.dirname, "..");
  const css = readFileSync(join(raiz, "app", "globals.css"), "utf8");

  it("declara una regla y un archivo por cada rubro", () => {
    for (const rubro of RUBROS) {
      const patron = patronDeRubro(rubro);
      const inicio = css.indexOf(`[data-patron="${patron}"]`);
      expect(inicio, `falta la regla de «${patron}» en globals.css`).toBeGreaterThan(-1);

      const bloque = css.slice(inicio, css.indexOf("}", inicio));
      const desde = bloque.indexOf('url("');
      expect(desde, `«${patron}» no apunta a ningún dibujo`).toBeGreaterThan(-1);

      const ruta = bloque.slice(desde + 5, bloque.indexOf('"', desde + 5));
      expect(existsSync(join(raiz, "public", ruta)), `falta ${ruta}`).toBe(true);
    }
  });
});
