import { describe, expect, it } from "vitest";

import { esPlantillaId } from "./validacion";

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
