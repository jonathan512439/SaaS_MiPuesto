import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PLAN_PRUEBA, PROMO_SEGUNDO_MES } from "./planes";

/* La oferta que se publica, igual en todos lados.
 *
 * El 2026-10-22 el dueño cambió el primer mes gratis por una prueba de quince
 * días y la promoción del segundo mes. Antes, la portada había escondido el mes
 * gratis y los términos lo seguían prometiendo: quien leía los términos lo
 * reclamaba con razón. Esta guardia no deja que vuelva a pasar. */

const RAIZ = join(import.meta.dirname, "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8");

const PUBLICAS = {
  portada: leer("app/page.tsx"),
  terminos: leer("app/(legal)/terminos/page.tsx"),
  imagenParaCompartir: leer("app/opengraph-image.tsx"),
  directorio: leer("components/directorio/pantalla-directorio.tsx"),
};

describe("la oferta publicada", () => {
  it("ninguna página promete el primer mes gratis", () => {
    for (const [pagina, fuente] of Object.entries(PUBLICAS)) {
      expect(fuente, pagina).not.toMatch(/primer mes (es )?gratis|mes gratis/i);
    }
  });

  it("la portada y los términos ofrecen la prueba con sus números", () => {
    for (const pagina of ["portada", "terminos"] as const) {
      expect(PUBLICAS[pagina], pagina).toContain("PLAN_PRUEBA");
    }
    expect(PUBLICAS.terminos).toContain("PLAN_PRUEBA.topes.productos");
    expect(PUBLICAS.terminos).toContain("PLAN_PRUEBA.lecturasPorMes");
  });

  it("la portada y los términos dicen la promoción del segundo mes", () => {
    for (const pagina of ["portada", "terminos"] as const) {
      expect(PUBLICAS[pagina], pagina).toContain("PROMO_SEGUNDO_MES");
    }
    expect(PROMO_SEGUNDO_MES).toMatch(/segundo mes va por nuestra cuenta/);
  });

  it("la prueba es de quince días, quince productos y cinco lecturas", () => {
    expect(PLAN_PRUEBA).toMatchObject({ dias: 15, lecturasPorMes: 5, topes: { productos: 15 } });
  });
});
