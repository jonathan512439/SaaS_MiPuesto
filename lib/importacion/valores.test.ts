import { describe, expect, it } from "vitest";

import { decodificarXml, leerPrecio } from "./valores";

describe("leer un precio escrito por una persona", () => {
  it("entiende las formas en que se escribe un precio boliviano", () => {
    expect(leerPrecio("12")).toBe(12);
    expect(leerPrecio("12,50")).toBe(12.5);
    expect(leerPrecio("12.50")).toBe(12.5);
    expect(leerPrecio("Bs 12")).toBe(12);
    expect(leerPrecio("12 Bs")).toBe(12);
    expect(leerPrecio("Bs. 12,50")).toBe(12.5);
    expect(leerPrecio(" 12 ")).toBe(12);
  });

  /* El mismo archivo abierto en dos computadoras con idioma distinto sale con
     el punto y la coma cambiados. Los dos tienen que dar lo mismo. */
  it("lee los miles igual con punto que con coma", () => {
    expect(leerPrecio("1.250,00")).toBe(1250);
    expect(leerPrecio("1,250.00")).toBe(1250);
  });

  /* El caso que más caro sale: un separador solo, con tres cifras detrás. Se
     decide que son miles porque en una lista boliviana los centavos se escriben
     con dos cifras. Leerlo como decimal convertiría mil doscientos cincuenta en
     uno con veinticinco. */
  it("resuelve el caso ambiguo hacia los miles", () => {
    expect(leerPrecio("1.250")).toBe(1250);
    expect(leerPrecio("1,250")).toBe(1250);
    expect(leerPrecio("12,5")).toBe(12.5);
    expect(leerPrecio("12,55")).toBe(12.55);
  });

  it("dice que no cuando no hay un precio", () => {
    expect(leerPrecio("")).toBeNull();
    expect(leerPrecio("consultar")).toBeNull();
    expect(leerPrecio("a convenir")).toBeNull();
    expect(leerPrecio("12 unidades por caja")).toBeNull();
  });
});

describe("texto que viene del XML", () => {
  it("devuelve los acentos y los símbolos escapados", () => {
    expect(decodificarXml("Az&#250;car")).toBe("Azúcar");
    expect(decodificarXml("Aceite &amp; vinagre")).toBe("Aceite & vinagre");
    expect(decodificarXml("&#171;Fino&#187;")).toBe("«Fino»");
  });

  /* `&amp;` se resuelve al final. Si se resolviera primero, un texto que dice
     literalmente «&amp;lt;» se convertiría en «<» y cambiaría lo que escribió
     el dueño. */
  it("no vuelve a interpretar lo que ya decodificó", () => {
    expect(decodificarXml("&amp;lt;")).toBe("&lt;");
  });
});
