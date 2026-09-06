import { describe, expect, it } from "vitest";

import {
  LARGO_CODIGO_ETIQUETA,
  esCodigoEtiqueta,
  generarCodigoEtiqueta,
  normalizarCodigoEtiqueta,
} from "./etiquetas";

describe("códigos de etiqueta", () => {
  it("genera códigos que la base acepta", () => {
    for (let intento = 0; intento < 200; intento += 1) {
      const codigo = generarCodigoEtiqueta();
      expect(codigo).toHaveLength(LARGO_CODIGO_ETIQUETA);
      expect(esCodigoEtiqueta(codigo)).toBe(true);
    }
  });

  /* Un código se dicta por teléfono: lo que se confunde al escucharlo o al
     leerlo no entra. */
  it("no usa caracteres que se confunden ni vocales", () => {
    const muchos = Array.from({ length: 300 }, () => generarCodigoEtiqueta()).join("");
    expect(muchos).not.toMatch(/[AEIOU01S5]/);
  });

  it("normaliza lo que escribe una persona", () => {
    expect(normalizarCodigoEtiqueta(" bcd234 ")).toBe("BCD234");
    expect(esCodigoEtiqueta("bcd234")).toBe(false);
    expect(esCodigoEtiqueta("BCD23")).toBe(false);
  });
});
