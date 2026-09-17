import { describe, expect, it } from "vitest";

import {
  construirUrlPublicaNegocio,
  construirUrlPublicaProducto,
  obtenerUrlBaseSitio,
  rutaProductoPublico,
} from "./url-sitio";

describe("URL pública del sitio", () => {
  it("normaliza la base y construye el enlace del negocio", () => {
    expect(obtenerUrlBaseSitio("https://mipuesto.example/ruta")).toBe("https://mipuesto.example");
    expect(construirUrlPublicaNegocio("tienda-kantuta", "https://mipuesto.example/ruta")).toBe(
      "https://mipuesto.example/tienda-kantuta",
    );
  });

  /* La tarjeta del catálogo enlaza con la ruta relativa y el enlace que se
     comparte lleva la completa. Tienen que ser la misma dirección: si no, el
     producto que el cliente ve al tocar y el que recibe por WhatsApp podrían
     ser dos. */
  it("la ruta del producto es la misma por dentro y por fuera", () => {
    expect(rutaProductoPublico("tienda-kantuta", "ABC-1")).toBe(
      "/tienda-kantuta/p/ABC-1",
    );
    expect(
      construirUrlPublicaProducto("tienda-kantuta", "ABC-1", "https://mipuesto.example"),
    ).toBe("https://mipuesto.example/tienda-kantuta/p/ABC-1");
  });

  it("escapa lo que podría salirse de la ruta", () => {
    expect(rutaProductoPublico("tienda", "a/b?c")).toBe("/tienda/p/a%2Fb%3Fc");
  });

  it("descarta protocolos inseguros", () => {
    expect(obtenerUrlBaseSitio("javascript:alert(1)")).toBe("http://localhost:3000");
  });
});
