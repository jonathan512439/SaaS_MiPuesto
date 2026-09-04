import { describe, expect, it } from "vitest";

import { construirProductoPublico } from "./producto-publico";

const NEGOCIO = {
  nombre: "Sabor Camba",
  telefono_whatsapp: "70000000",
  tipo_negocio: "tienda_virtual",
};

const PRODUCTO = {
  id: "11111111-1111-1111-1111-111111111111",
  codigo: "PRD-ABC12345",
  nombre: "Hamburguesa clásica",
  descripcion: "Pan casero, carne de res y queso.",
  precio: 45,
  fotos: ["negocio/uno.webp", "negocio/dos.webp"],
  estado: "disponible",
  controla_stock: true,
  cantidad_stock: 10,
  cantidad_reservada: 0,
  categoria_id: "cat-1",
};

const AHORA = new Date("2026-09-04T16:00:00Z");
const URL_SUPABASE = "https://proyecto.supabase.co";

describe("construirProductoPublico", () => {
  it("expone todas las fotografías, no solo la primera", () => {
    const producto = construirProductoPublico(NEGOCIO, PRODUCTO, URL_SUPABASE, AHORA, []);
    expect(producto.imagenes).toHaveLength(2);
    expect(producto.imagenes[0].src).toContain("uno.webp");
  });

  it("describe las fotografías siguientes para que el alt no se repita", () => {
    const producto = construirProductoPublico(NEGOCIO, PRODUCTO, URL_SUPABASE, AHORA, []);
    expect(producto.imagenes[0].alt).toBe("Hamburguesa clásica");
    expect(producto.imagenes[1].alt).toBe("Hamburguesa clásica, fotografía 2");
  });

  it("aplica la promoción vigente y conserva el precio original", () => {
    const producto = construirProductoPublico(NEGOCIO, PRODUCTO, URL_SUPABASE, AHORA, [
      {
        id: "promo-1",
        tipo: "porcentaje",
        valor: 20,
        producto_id: PRODUCTO.id,
        categoria_id: null,
        fecha_inicio: null,
        fecha_fin: null,
        activo: true,
      },
    ]);
    expect(producto.tienePromocion).toBe(true);
    expect(producto.precio).toBe(36);
    expect(producto.precioOriginal).toBe(45);
  });

  it("pasa a reservado cuando la reserva consume todo el stock", () => {
    const producto = construirProductoPublico(
      NEGOCIO,
      { ...PRODUCTO, cantidad_reservada: 10 },
      URL_SUPABASE,
      AHORA,
      [],
    );
    expect(producto.cantidadDisponible).toBe(0);
    expect(producto.estado).toBe("reservado");
  });

  it("no ofrece WhatsApp cuando el negocio es solo catálogo", () => {
    const producto = construirProductoPublico(
      { ...NEGOCIO, tipo_negocio: "catalogo_estatico" },
      PRODUCTO,
      URL_SUPABASE,
      AHORA,
      [],
    );
    expect(producto.accionWhatsapp).toBeNull();
  });

  it("ofrece WhatsApp con el precio ya promocionado", () => {
    const producto = construirProductoPublico(NEGOCIO, PRODUCTO, URL_SUPABASE, AHORA, []);
    expect(producto.accionWhatsapp).toContain("wa.me");
  });

  it("deja la galería vacía si el producto no tiene fotos", () => {
    const producto = construirProductoPublico(
      NEGOCIO,
      { ...PRODUCTO, fotos: [] },
      URL_SUPABASE,
      AHORA,
      [],
    );
    expect(producto.imagenes).toEqual([]);
  });
});
