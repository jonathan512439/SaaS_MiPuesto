import { describe, expect, it } from "vitest";

import {
  calcularPrecioProducto,
  calcularSubtotal,
  formatearPrecioBolivianos,
  promocionEstaVigente,
  type PromocionPrecio,
} from "./precios";

const PROMOCION_BASE: PromocionPrecio = {
  id: "promo-1",
  activo: true,
  categoria_id: null,
  fecha_fin: null,
  fecha_inicio: null,
  producto_id: "producto-1",
  tipo: "porcentaje",
  valor: 10,
};

describe("formato de precios", () => {
  it("muestra la moneda boliviana sin decimales innecesarios", () => {
    expect(formatearPrecioBolivianos(45)).toBe("Bs 45");
  });

  it("conserva los centavos cuando existen", () => {
    expect(formatearPrecioBolivianos(45.5)).toBe("Bs 45,5");
  });
});

describe("subtotal de productos", () => {
  it("calcula cantidades en centavos para evitar errores decimales", () => {
    expect(
      calcularSubtotal([
        { precio: 10.1, cantidad: 2 },
        { precio: 5.25, cantidad: 1 },
      ]),
    ).toBe(25.45);
  });

  it("ignora cantidades y precios inválidos", () => {
    expect(
      calcularSubtotal([
        { precio: 10, cantidad: 0 },
        { precio: -1, cantidad: 2 },
        { precio: 5, cantidad: 1 },
      ]),
    ).toBe(5);
  });
});

describe("promociones", () => {
  it("aplica porcentaje y monto fijo sin errores decimales", () => {
    expect(
      calcularPrecioProducto(
        99.9,
        { productoId: "producto-1", categoriaId: null },
        [PROMOCION_BASE],
      ),
    ).toMatchObject({ precioOriginal: 99.9, precioFinal: 89.91, ahorro: 9.99 });

    expect(
      calcularPrecioProducto(
        20,
        { productoId: "producto-1", categoriaId: null },
        [{ ...PROMOCION_BASE, tipo: "monto_fijo", valor: 3.5 }],
      ).precioFinal,
    ).toBe(16.5);
  });

  it("nunca genera un precio negativo", () => {
    expect(
      calcularPrecioProducto(
        10,
        { productoId: "producto-1", categoriaId: null },
        [{ ...PROMOCION_BASE, tipo: "monto_fijo", valor: 50 }],
      ).precioFinal,
    ).toBe(0);
  });

  it("elige el menor precio entre promoción de producto y categoría", () => {
    const resultado = calcularPrecioProducto(
      100,
      { productoId: "producto-1", categoriaId: "categoria-1" },
      [
        { ...PROMOCION_BASE, valor: 10 },
        {
          ...PROMOCION_BASE,
          id: "promo-categoria",
          producto_id: null,
          categoria_id: "categoria-1",
          valor: 25,
        },
      ],
    );

    expect(resultado.precioFinal).toBe(75);
    expect(resultado.promocion?.id).toBe("promo-categoria");
  });

  it("considera inicio inclusivo y fin exclusivo", () => {
    const promocion = {
      ...PROMOCION_BASE,
      fecha_inicio: "2026-09-03T12:00:00.000Z",
      fecha_fin: "2026-09-03T13:00:00.000Z",
    };

    expect(promocionEstaVigente(promocion, new Date("2026-09-03T12:00:00.000Z"))).toBe(true);
    expect(promocionEstaVigente(promocion, new Date("2026-09-03T13:00:00.000Z"))).toBe(false);
  });

  it("ignora promociones vencidas, inactivas, inválidas o de otro destino", () => {
    const fecha = new Date("2026-09-03T12:00:00.000Z");
    const resultado = calcularPrecioProducto(
      50,
      { productoId: "producto-1", categoriaId: "categoria-1" },
      [
        { ...PROMOCION_BASE, activo: false, valor: 90 },
        { ...PROMOCION_BASE, fecha_fin: "2026-09-03T11:59:59.000Z", valor: 90 },
        { ...PROMOCION_BASE, producto_id: "otro", valor: 90 },
        { ...PROMOCION_BASE, valor: 101 },
      ],
      fecha,
    );

    expect(resultado).toMatchObject({ precioFinal: 50, ahorro: 0, promocion: null });
  });
});
