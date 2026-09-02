import { describe, expect, it } from "vitest";

import {
  detectarTipoImagen,
  extensionPorTipo,
  PESO_MAXIMO_COMPRIMIDO,
  validarImagenBinaria,
} from "./imagenes";

describe("validación binaria de imágenes", () => {
  it("reconoce JPEG, PNG y WebP por firma", () => {
    expect(detectarTipoImagen(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(
      detectarTipoImagen(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe("image/png");
    expect(
      detectarTipoImagen(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      ),
    ).toBe("image/webp");
  });

  it("rechaza contenido disfrazado y archivos vacíos", () => {
    expect(validarImagenBinaria(new Uint8Array([0x3c, 0x73, 0x76, 0x67])).correcto).toBe(false);
    expect(validarImagenBinaria(new Uint8Array()).correcto).toBe(false);
  });

  it("rechaza imágenes comprimidas mayores a 2 MB", () => {
    const bytes = new Uint8Array(PESO_MAXIMO_COMPRIMIDO + 1);
    bytes.set([0xff, 0xd8, 0xff]);
    expect(validarImagenBinaria(bytes).correcto).toBe(false);
  });

  it("asigna extensiones seguras desde el contenido detectado", () => {
    expect(extensionPorTipo("image/jpeg")).toBe("jpg");
    expect(extensionPorTipo("image/png")).toBe("png");
    expect(extensionPorTipo("image/webp")).toBe("webp");
  });
});
