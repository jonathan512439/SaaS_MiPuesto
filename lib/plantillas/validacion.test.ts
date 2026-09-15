import { describe, expect, it } from "vitest";

import { PALETAS } from "../apariencia";
import { esPaletaId } from "./validacion";

/* Antes vigilaba además las plantillas y las veintiocho combinaciones de diseño
   y color. Con la poda de la fase 6 el diseño es uno solo: el único eje que se
   valida es el color. */
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
});
