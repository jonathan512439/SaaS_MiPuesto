import { describe, expect, it } from "vitest";

import { construirUrlPublicaNegocio, obtenerUrlBaseSitio } from "./url-sitio";

describe("URL pública del sitio", () => {
  it("normaliza la base y construye el enlace del negocio", () => {
    expect(obtenerUrlBaseSitio("https://mipuesto.example/ruta")).toBe("https://mipuesto.example");
    expect(construirUrlPublicaNegocio("tienda-kantuta", "https://mipuesto.example/ruta")).toBe(
      "https://mipuesto.example/tienda-kantuta",
    );
  });

  it("descarta protocolos inseguros", () => {
    expect(obtenerUrlBaseSitio("javascript:alert(1)")).toBe("http://localhost:3000");
  });
});

