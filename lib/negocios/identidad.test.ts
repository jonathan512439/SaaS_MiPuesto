import { describe, expect, it } from "vitest";

import {
  normalizarRedesSociales,
  rutaPerteneceAImagenNegocio,
} from "./identidad";

describe("identidad del negocio", () => {
  it("acepta únicamente enlaces HTTPS y elimina fragmentos", () => {
    expect(
      normalizarRedesSociales({
        instagram: " https://instagram.com/mipuesto#perfil ",
        sitio_web: "https://mi-puesto.com",
      }),
    ).toEqual({
      correcto: true,
      redes: {
        instagram: "https://instagram.com/mipuesto",
        sitio_web: "https://mi-puesto.com/",
      },
    });
  });

  it("rechaza protocolos inseguros", () => {
    const resultado = normalizarRedesSociales({ facebook: "javascript:alert(1)" });
    expect(resultado.correcto).toBe(false);
  });

  it("solo reconoce rutas de la carpeta y tipo esperados", () => {
    expect(rutaPerteneceAImagenNegocio("negocio-1/logo/archivo.webp", "negocio-1", "logo")).toBe(true);
    expect(rutaPerteneceAImagenNegocio("negocio-2/logo/archivo.webp", "negocio-1", "logo")).toBe(false);
    expect(rutaPerteneceAImagenNegocio("negocio-1/portada/archivo.webp", "negocio-1", "logo")).toBe(false);
  });
});
