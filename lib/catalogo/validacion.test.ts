import { describe, expect, it } from "vitest";

import {
  esUuid,
  estadoPorStock,
  normalizarNombreOrganizacion,
  validarNombreOrganizacion,
  validarProducto,
} from "./validacion";

describe("validación del catálogo", () => {
  it("normaliza nombres y limita categorías", () => {
    expect(normalizarNombreOrganizacion("  Comida   rápida ")).toBe("Comida rápida");
    expect(validarNombreOrganizacion(" ")).toBe("El nombre es obligatorio.");
    expect(validarNombreOrganizacion("a".repeat(81))).toContain("80");
  });

  it("reconoce UUID y rechaza identificadores arbitrarios", () => {
    expect(esUuid("50000000-0000-4000-8000-000000000001")).toBe(true);
    expect(esUuid("../otro-negocio")).toBe(false);
  });

  it("acepta un producto sin stock controlado", () => {
    const resultado = validarProducto({
      nombre: "  Majadito  batido ",
      descripcion: "Plato tradicional",
      precio: "38,50",
      categoria_id: null,
      subcategoria_id: null,
      controla_stock: false,
      cantidad_stock: 99,
    });

    expect(resultado).toEqual({
      correcto: true,
      datos: {
        nombre: "Majadito batido",
        descripcion: "Plato tradicional",
        precio: 38.5,
        categoria_id: null,
        subcategoria_id: null,
        controla_stock: false,
        cantidad_stock: null,
      },
    });
  });

  it("rechaza relaciones, precio y stock inválidos", () => {
    const resultado = validarProducto({
      nombre: "Producto",
      descripcion: "",
      precio: "1.999",
      categoria_id: null,
      subcategoria_id: "50000000-0000-4000-8000-000000000001",
      controla_stock: true,
      cantidad_stock: -1,
    });

    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) {
      expect(resultado.errores.precio).toBeTruthy();
      expect(resultado.errores.subcategoria_id).toBeTruthy();
      expect(resultado.errores.cantidad_stock).toBeTruthy();
    }
  });

  it("calcula el estado inicial a partir del stock", () => {
    expect(estadoPorStock(true, 0)).toBe("agotado");
    expect(estadoPorStock(true, 3)).toBe("disponible");
    expect(estadoPorStock(true, 3, 3)).toBe("reservado");
    expect(estadoPorStock(true, 3, 1)).toBe("disponible");
    expect(estadoPorStock(false, null)).toBe("disponible");
  });
});
