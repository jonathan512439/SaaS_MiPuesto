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

describe("precios por horario", () => {
  const base = {
    tipo: "porcentaje",
    valor: 50,
    producto_id: "p-1",
    categoria_id: null,
    fecha_inicio: null,
    fecha_fin: null,
    activo: true,
  };

  /* Bolivia va cuatro horas detrás de UTC. Las 16:00 UTC son las 12:00 acá. */
  const MEDIODIA_BOLIVIA = new Date("2026-03-11T16:00:00.000Z"); // miércoles
  const OCHO_MANANA_BOLIVIA = new Date("2026-03-11T12:00:00.000Z");

  it("usa la hora de Bolivia y no la del servidor", () => {
    const almuerzo = { ...base, hora_inicio: "12:00:00", hora_fin: "14:00:00" };
    expect(promocionEstaVigente(almuerzo, MEDIODIA_BOLIVIA)).toBe(true);
    /* Sin la conversión, las 12:00 UTC —8 de la mañana acá— caerían dentro. */
    expect(promocionEstaVigente(almuerzo, OCHO_MANANA_BOLIVIA)).toBe(false);
  });

  it("incluye el minuto de inicio y excluye el de fin", () => {
    const ventana = { ...base, hora_inicio: "12:00:00", hora_fin: "14:00:00" };
    expect(promocionEstaVigente(ventana, new Date("2026-03-11T16:00:00.000Z"))).toBe(true);
    expect(promocionEstaVigente(ventana, new Date("2026-03-11T17:59:00.000Z"))).toBe(true);
    expect(promocionEstaVigente(ventana, new Date("2026-03-11T18:00:00.000Z"))).toBe(false);
  });

  /* «Viernes de 22:00 a 02:00» es una noche, no dos ventanas sueltas. Sin esta
     regla el happy hour se corta a las doce en punto y el cliente que ya estaba
     sentado paga otro precio. */
  it("trata la madrugada como parte de la noche anterior", () => {
    const nocheDelViernes = {
      ...base,
      hora_inicio: "22:00:00",
      hora_fin: "02:00:00",
      dias: [5],
    };
    // Viernes 23:00 en Bolivia = sábado 03:00 UTC
    expect(promocionEstaVigente(nocheDelViernes, new Date("2026-03-14T03:00:00.000Z"))).toBe(true);
    // Sábado 01:00 en Bolivia = sábado 05:00 UTC: sigue siendo la del viernes
    expect(promocionEstaVigente(nocheDelViernes, new Date("2026-03-14T05:00:00.000Z"))).toBe(true);
    // Sábado 23:00 en Bolivia: ya es otra noche, no aplica
    expect(promocionEstaVigente(nocheDelViernes, new Date("2026-03-15T03:00:00.000Z"))).toBe(false);
  });

  it("respeta los días sin ventana de horas", () => {
    const soloMiercoles = { ...base, dias: [3] };
    expect(promocionEstaVigente(soloMiercoles, MEDIODIA_BOLIVIA)).toBe(true);
    expect(promocionEstaVigente(soloMiercoles, new Date("2026-03-12T16:00:00.000Z"))).toBe(false);
  });

  /* Lo que ya existe no cambia de precio: una promoción sin horario ni días se
     comporta exactamente como antes de esta función. */
  it("no toca las promociones sin horario", () => {
    expect(promocionEstaVigente(base, MEDIODIA_BOLIVIA)).toBe(true);
    expect(promocionEstaVigente({ ...base, dias: null }, OCHO_MANANA_BOLIVIA)).toBe(true);
  });

  it("aplica el descuento solo dentro de la ventana", () => {
    const promociones = [{ ...base, hora_inicio: "12:00:00", hora_fin: "14:00:00" }];
    const dentro = calcularPrecioProducto(
      40,
      { productoId: "p-1", categoriaId: null },
      promociones,
      MEDIODIA_BOLIVIA,
    );
    const fuera = calcularPrecioProducto(
      40,
      { productoId: "p-1", categoriaId: null },
      promociones,
      OCHO_MANANA_BOLIVIA,
    );
    expect(dentro.precioFinal).toBe(20);
    expect(fuera.precioFinal).toBe(40);
    expect(fuera.promocion).toBe(null);
  });
});
