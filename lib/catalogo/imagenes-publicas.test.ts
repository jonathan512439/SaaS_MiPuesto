import { describe, expect, it } from "vitest";

import { obtenerUrlPublicaImagenProducto } from "./imagenes-publicas";

describe("obtenerUrlPublicaImagenProducto", () => {
  it("construye la URL del bucket sin duplicar barras", () => {
    expect(
      obtenerUrlPublicaImagenProducto(
        "https://proyecto.supabase.co/",
        "negocio/producto/foto.webp",
      ),
    ).toBe(
      "https://proyecto.supabase.co/storage/v1/object/public/productos/negocio/producto/foto.webp",
    );
  });

  it("codifica cada segmento de una ruta", () => {
    expect(
      obtenerUrlPublicaImagenProducto("https://proyecto.supabase.co", "negocio/foto uno.webp"),
    ).toContain("foto%20uno.webp");
  });
});
