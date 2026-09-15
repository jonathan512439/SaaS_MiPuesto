import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/* La plantilla clásica calculaba `activa` y no la usaba para nada: la variable
   existía, el `aria-pressed` salía bien y visualmente no pasaba nada. La mínima
   ni siquiera tenía estilo para esos botones. Ninguna de las dos cosas rompe una
   prueba de comportamiento ni el compilador, y se descubrieron mirando el
   catálogo.
 *
 * Aquellas plantillas ya no existen, pero el descuido sí puede repetirse: la
 * esfera activa se marca con una clase, y quitarla no lo atrapa nada. Se
 * comprueba lo mínimo que no puede faltar: que la clase se use y que exista.
 */
const CARPETA = join(process.cwd(), "components", "templates", "mipuesto");

describe("la categoría elegida se nota", () => {
  const tsx = readFileSync(join(CARPETA, "plantilla-mipuesto.tsx"), "utf8");
  const css = readFileSync(join(CARPETA, "plantilla-mipuesto.module.css"), "utf8");

  /* Dos y no una: el botón «Todo» y el de cada categoría. Buscarla una sola vez
     dejaba pasar el caso real, que era marcar «Todo» y olvidarse del resto. */
  it("marca con la clase tanto «Todo» como cada categoría", () => {
    const usos = tsx.split("styles.esferaActiva").length - 1;
    expect(usos, "la esfera activa no se marca en los dos lugares").toBeGreaterThanOrEqual(2);
  });

  it("la clase existe en la hoja, y no solo en el componente", () => {
    expect(css, "la hoja no define la esfera activa").toContain(".esferaActiva");
  });

  /* Sin esto, quien navega con lector de pantalla no sabe cuál está elegida:
     la ve pintada quien puede verla, y nadie más. */
  it("lo dice también para el lector de pantalla", () => {
    expect(tsx).toContain("aria-pressed");
  });
});
