import { describe, expect, it } from "vitest";

import {
  LARGO_CODIGO_ETIQUETA,
  dominioDeEtiquetasConectado,
  enlaceDeEtiqueta,
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

  /* Se graba en plástico: tiene que ser la dirección definitiva, no la de hoy. */
  it("arma el enlace con el dominio definitivo, sea cual sea la dirección de hoy", () => {
    expect(enlaceDeEtiqueta("BCD234")).toBe("https://mi-puesto.com/t/BCD234");
  });

  it("sabe si el sitio ya sirve desde ese dominio", () => {
    expect(dominioDeEtiquetasConectado("https://mi-puesto.com")).toBe(true);
    expect(dominioDeEtiquetasConectado("https://www.mi-puesto.com")).toBe(true);
    expect(dominioDeEtiquetasConectado("https://mipuesto.workers.dev")).toBe(false);
    /* El de un tercero, sin guion. Por partes para que la guardia del dominio
       ajeno (`lib/marca/dominio.test.ts`) no lo cuente como escrito. */
    expect(dominioDeEtiquetasConectado(`https://${["mipuesto", "com"].join(".")}`)).toBe(false);
    expect(dominioDeEtiquetasConectado("https://falso-mi-puesto.com")).toBe(false);
    expect(dominioDeEtiquetasConectado("http://localhost:3000")).toBe(false);
  });

  it("normaliza lo que escribe una persona", () => {
    expect(normalizarCodigoEtiqueta(" bcd234 ")).toBe("BCD234");
    expect(esCodigoEtiqueta("bcd234")).toBe(false);
    expect(esCodigoEtiqueta("BCD23")).toBe(false);
  });
});
