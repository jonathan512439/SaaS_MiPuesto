import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MAXIMO_BANNERS } from "../../lib/negocios/banners";

/* Que el modelo admita un banner y la plantilla no lo dibuje es una falla que no
   atrapa nadie: no la ve el compilador, no la ve el lint, y el dueño se entera
   cargando una promoción que después no aparece en su catálogo.
 *
 * La prueba mira el texto de la plantilla y no el resultado de dibujarla a
 * propósito: lo que se quiere vigilar es que **exista la línea**, no que con
 * ciertos datos se vea algo. */
describe("los banners del catálogo", () => {
  const fuente = readFileSync(
    join(import.meta.dirname, "mipuesto", "plantilla-mipuesto.tsx"),
    "utf8",
  );

  it("la plantilla dibuja todos los que el modelo admite", () => {
    for (let posicion = 0; posicion < MAXIMO_BANNERS; posicion += 1) {
      expect(fuente, `no dibuja el banner ${posicion}`).toContain(
        `<BannerCatalogo banner={negocio.banners[${posicion}]} />`,
      );
    }
  });

  /* Y ninguno de más: leer una posición que el modelo no llena deja una pieza
     que nunca recibe nada, y con ella la duda de si el banner no se ve porque
     está mal cargado o porque esa ranura no existe. */
  it("no lee posiciones que el modelo no llena", () => {
    expect(fuente).not.toContain(`negocio.banners[${MAXIMO_BANNERS}]`);
  });
});
