import { describe, expect, it } from "vitest";

import { limpiarNombreDeRecurso, nombreParaRenombrar } from "./recursos";

describe("limpiarNombreDeRecurso", () => {
  it("quita los espacios de más", () => {
    expect(limpiarNombreDeRecurso("  Dra.   Paola ")).toBe("Dra. Paola");
  });

  it("rechaza lo vacío, lo que no es texto y lo de más de 60 letras", () => {
    expect(limpiarNombreDeRecurso("   ")).toBeNull();
    expect(limpiarNombreDeRecurso(42)).toBeNull();
    expect(limpiarNombreDeRecurso("a".repeat(61))).toBeNull();
    expect(limpiarNombreDeRecurso("a".repeat(60))).toBe("a".repeat(60));
  });
});

/* El rubro siembra a quien atiende con el nombre de la categoría —«Consultas»,
   «Vacunación»— y el dueño lo cambia por el de la persona: «Dra. Paola». */
describe("nombreParaRenombrar", () => {
  it("devuelve el nombre nuevo, limpio", () => {
    expect(nombreParaRenombrar("Consultas", " Dra.  Paola")).toBe("Dra. Paola");
  });

  it("no ofrece guardar si no cambió nada", () => {
    expect(nombreParaRenombrar("Consultas", "Consultas")).toBeNull();
    expect(nombreParaRenombrar("Consultas", "  Consultas ")).toBeNull();
  });

  it("no ofrece guardar un nombre que el servidor rechazaría", () => {
    expect(nombreParaRenombrar("Consultas", "")).toBeNull();
    expect(nombreParaRenombrar("Consultas", "a".repeat(61))).toBeNull();
  });
});
