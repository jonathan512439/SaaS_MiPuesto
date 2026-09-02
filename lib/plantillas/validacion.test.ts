import { describe, expect, it } from "vitest";

import { COMBINACIONES_APARIENCIA } from "../apariencia";
import { esPaletaId, esPlantillaId } from "./validacion";

describe("validación de plantillas", () => {
  it.each(["clasica", "moderna", "minimal"])("acepta la plantilla %s", (plantilla) => {
    expect(esPlantillaId(plantilla)).toBe(true);
  });

  it.each(["otra", "Clásica", "", null, 3, { plantilla_id: "clasica" }])(
    "rechaza un identificador no permitido: %o",
    (plantilla) => {
      expect(esPlantillaId(plantilla)).toBe(false);
    },
  );
});

describe("validación de paletas", () => {
  it.each(["mercado", "tierra", "oceano", "noche"])("acepta la paleta %s", (paleta) => {
    expect(esPaletaId(paleta)).toBe(true);
  });

  it.each(["otra", "Noche", "", null, 3, { paleta_id: "mercado" }])(
    "rechaza la paleta %s",
    (paleta) => {
      expect(esPaletaId(paleta)).toBe(false);
    },
  );

  it("expone las doce combinaciones de plantilla y paleta", () => {
    expect(COMBINACIONES_APARIENCIA).toHaveLength(12);
    expect(
      new Set(
        COMBINACIONES_APARIENCIA.map(({ plantilla, paleta }) => `${plantilla}:${paleta}`),
      ).size,
    ).toBe(12);
  });
});
