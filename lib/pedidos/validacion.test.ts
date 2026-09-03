import { describe, expect, it } from "vitest";

import { normalizarTelefonoCliente, validarSolicitudPedido } from "./validacion";

const PRODUCTO_ID = "50000000-0000-4000-8000-000000000002";
const IDEMPOTENCIA = "90000000-0000-4000-8000-000000000001";

describe("validación de pedidos", () => {
  it("normaliza los datos opcionales y acepta un pedido válido", () => {
    const resultado = validarSolicitudPedido({
      slug: " Tienda-Kantuta ",
      items: [{ productoId: PRODUCTO_ID, cantidad: 2 }],
      clienteNombre: "  Ana   Pérez ",
      clienteTelefono: "7123-4567",
      idempotencia: IDEMPOTENCIA,
      total: 1,
    });

    expect(resultado).toEqual({
      correcto: true,
      datos: {
        slug: "tienda-kantuta",
        items: [{ productoId: PRODUCTO_ID, cantidad: 2 }],
        clienteNombre: "Ana Pérez",
        clienteTelefono: "59171234567",
        idempotencia: IDEMPOTENCIA,
      },
    });
  });

  it("no recibe ni utiliza un total calculado por el navegador", () => {
    const resultado = validarSolicitudPedido({
      slug: "tienda-kantuta",
      items: [{ productoId: PRODUCTO_ID, cantidad: 1 }],
      idempotencia: IDEMPOTENCIA,
      total: -999,
    });

    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) expect(resultado.datos).not.toHaveProperty("total");
  });

  it("rechaza duplicados y cantidades fuera del límite", () => {
    expect(
      validarSolicitudPedido({
        slug: "tienda-kantuta",
        items: [
          { productoId: PRODUCTO_ID, cantidad: 1 },
          { productoId: PRODUCTO_ID, cantidad: 1 },
        ],
        idempotencia: IDEMPOTENCIA,
      }).correcto,
    ).toBe(false);
    expect(
      validarSolicitudPedido({
        slug: "tienda-kantuta",
        items: [{ productoId: PRODUCTO_ID, cantidad: 100 }],
        idempotencia: IDEMPOTENCIA,
      }).correcto,
    ).toBe(false);
  });

  it("valida celulares bolivianos solo cuando fueron informados", () => {
    expect(normalizarTelefonoCliente("")).toBeNull();
    expect(normalizarTelefonoCliente("+591 6123 4567")).toBe("59161234567");
    expect(normalizarTelefonoCliente("12345678")).toBeUndefined();
  });
});
