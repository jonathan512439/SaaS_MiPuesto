import { afterEach, describe, expect, it, vi } from "vitest";

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

/* En el navegador, la variable existe solo si estaba al compilar. Cuando falta,
   la dirección sale de la página abierta y no de `localhost`: con `localhost`,
   el enlace que el dueño copiaba para WhatsApp no le abría a nadie. */
describe("la dirección en el navegador", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sin la variable, usa la dirección de la página", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubGlobal("window", { location: { origin: "https://mi-puesto.com" } });
    expect(obtenerUrlBaseSitio()).toBe("https://mi-puesto.com");
    expect(construirUrlPublicaProducto("kantuta-moda", "PRD-1")).toBe(
      "https://mi-puesto.com/kantuta-moda/p/PRD-1",
    );
  });

  it("con la variable, manda la variable", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mi-puesto.com");
    vi.stubGlobal("window", { location: { origin: "https://otra.direccion" } });
    expect(obtenerUrlBaseSitio()).toBe("https://mi-puesto.com");
  });

  it("en el servidor, sin la variable, sigue siendo la local", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(obtenerUrlBaseSitio()).toBe("http://localhost:3000");
  });
});
