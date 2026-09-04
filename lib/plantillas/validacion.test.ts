import { describe, expect, it } from "vitest";

import { COMBINACIONES_APARIENCIA, PALETAS, PLANTILLAS } from "../apariencia";
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
  it.each([...PALETAS])("acepta la paleta %s", (paleta) => {
    expect(esPaletaId(paleta)).toBe(true);
  });

  it.each(["otra", "Noche", "", null, 3, { paleta_id: "mercado" }])(
    "rechaza la paleta %s",
    (paleta) => {
      expect(esPaletaId(paleta)).toBe(false);
    },
  );

  /* No se fija un numero: al sumar una paleta habria que corregir la prueba y
     esa correccion mecanica es la que suele esconder un olvido. Lo que importa
     es que esten todas y que ninguna se repita. */
  it("expone cada combinacion de plantilla y paleta una sola vez", () => {
    const total = PLANTILLAS.length * PALETAS.length;

    expect(COMBINACIONES_APARIENCIA).toHaveLength(total);
    expect(
      new Set(
        COMBINACIONES_APARIENCIA.map(({ plantilla, paleta }) => `${plantilla}:${paleta}`),
      ).size,
    ).toBe(total);
  });
});
