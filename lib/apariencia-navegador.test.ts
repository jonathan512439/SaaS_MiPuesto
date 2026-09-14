import { describe, expect, it } from "vitest";

import { PALETAS } from "./apariencia";
import { COLOR_NAVEGADOR, colorDeNavegador } from "./apariencia-navegador";

describe("color de la barra del navegador", () => {
  /* Cada paleta tiene su color: si mañana se agrega una octava y se olvida acá,
     el catálogo de ese negocio pintaría la barra con el color de otra paleta. */
  it("hay una entrada por cada paleta", () => {
    for (const paleta of PALETAS) {
      expect(COLOR_NAVEGADOR[paleta], paleta).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("cae a una paleta conocida con algo inválido", () => {
    expect(colorDeNavegador("inventada")).toBe(COLOR_NAVEGADOR.mercado);
  });
})
