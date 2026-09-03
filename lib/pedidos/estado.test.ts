import { describe, expect, it } from "vitest";

import { esEstadoPedido, etiquetaEstadoPedido, formatearFechaPedido } from "./estado";

describe("estados de pedido", () => {
  it("usa nombres comprensibles para el administrador", () => {
    expect(etiquetaEstadoPedido("pendiente")).toBe("Por confirmar");
    expect(etiquetaEstadoPedido("confirmado")).toBe("Venta confirmada");
    expect(esEstadoPedido("cancelado")).toBe(true);
    expect(esEstadoPedido("inventado")).toBe(false);
  });

  it("muestra fechas en la zona horaria de Bolivia", () => {
    expect(formatearFechaPedido("2026-09-03T03:30:00.000Z")).toContain("23:30");
    expect(formatearFechaPedido(null)).toBe("Sin fecha");
    expect(formatearFechaPedido("no-es-fecha")).toBe("Fecha no disponible");
  });
});
