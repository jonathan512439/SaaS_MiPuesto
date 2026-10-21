import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { LUGAR_BANNER, MAXIMO_BANNERS } from "../../lib/negocios/banners";

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

  /* Por nombre de lugar y no por posición: el superior está en el 1 y el
     inferior en el 0 (ver `LUGAR_BANNER`), y un índice escrito a mano es
     exactamente como se confunden. */
  it("la plantilla dibuja todos los lugares que el modelo admite, por su nombre", () => {
    expect(Object.keys(LUGAR_BANNER)).toHaveLength(MAXIMO_BANNERS);
    for (const lugar of Object.keys(LUGAR_BANNER)) {
      expect(fuente, `no dibuja el banner ${lugar}`).toContain(
        `banner={bannerDelLugar(negocio.banners, "${lugar}")}`,
      );
    }
  });

  /* Y nunca por índice: leer una posición a mano deja la duda de si el banner
     no se ve porque está mal cargado o porque esa ranura no es la que se cree. */
  it("no lee los banners por índice", () => {
    expect(fuente).not.toContain("negocio.banners[");
  });
});
