import { describe, expect, it } from "vitest";

import { esPlanilla } from "./adjunto";

const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
const OLE = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const TEXTO = new TextEncoder().encode("Producto;Precio");

describe("esPlanilla", () => {
  it("reconoce un Excel por su contenido, aunque venga sin extensión", () => {
    expect(esPlanilla(ZIP, "inventario")).toBe(true);
    expect(esPlanilla(OLE, "lista vieja")).toBe(true);
  });

  it("reconoce un CSV por su nombre, porque el texto no tiene firma", () => {
    expect(esPlanilla(TEXTO, "precios.csv")).toBe(true);
    expect(esPlanilla(TEXTO, "PRECIOS.CSV ")).toBe(true);
  });

  it("deja pasar las fotos y los PDF, que sí se mandan a leer", () => {
    expect(esPlanilla(JPG, "lista.jpg")).toBe(false);
    expect(esPlanilla(PDF, "proveedor.pdf")).toBe(false);
    expect(esPlanilla(TEXTO, "notas.txt")).toBe(false);
  });
});
