import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { rubroQueVeElDueno } from "./rubros-publicos";

/* La plataforma muestra el rubro que ve el dueño.
 *
 * Mostraba la siembra —«Otro»— mientras el panel del dueño decía
 * «Importados y variedades»: el último negocio registrado se veía con otro
 * rubro en cada pantalla. */

describe("el rubro en la plataforma", () => {
  it("manda el rubro público, y la siembra va al lado si se llama distinto", () => {
    expect(rubroQueVeElDueno("importados", "otro")).toBe("Importados y variedades · catálogo de otro");
    expect(rubroQueVeElDueno("comida_rapida", "restaurante")).toBe(
      "Comida rápida · catálogo de restaurante o comida",
    );
    expect(rubroQueVeElDueno("veterinaria", "veterinaria")).not.toContain("·");
  });

  it("sin rubro público, la siembra; sin nada, «Sin definir»", () => {
    expect(rubroQueVeElDueno(null, "restaurante")).toBe("Restaurante o comida");
    expect(rubroQueVeElDueno(null, null)).toBe("Sin definir");
  });

  it("es lo que dibuja la lista de negocios", () => {
    /* Desde el rediseño del 2026-10-21 la lista la dibuja el componente de
       pantalla, y la página solo lee la base. */
    const pantalla = readFileSync(
      join(import.meta.dirname, "..", "..", "components/plataforma/pantalla-plataforma.tsx"),
      "utf8",
    );
    expect(pantalla).toContain("rubroQueVeElDueno(negocio.rubro_publico, negocio.rubro)");
  });
});
