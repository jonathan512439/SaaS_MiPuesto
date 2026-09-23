import { describe, expect, it } from "vitest";

import { normalizarTelefonoCliente, validarSolicitudPedido } from "./validacion";

const PRODUCTO_ID = "50000000-0000-4000-8000-000000000002";
const IDEMPOTENCIA = "90000000-0000-4000-8000-000000000001";
const TALLA_M = "60000000-0000-4000-8000-000000000001";
const TALLA_L = "60000000-0000-4000-8000-000000000002";

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
        numeroMesa: null,
      slug: "tienda-kantuta",
        items: [{ productoId: PRODUCTO_ID, varianteId: null, cantidad: 2 }],
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

  /* Fase 13: la presentación viaja en el renglón. Que sea de ese producto lo
     decide la base; acá solo se exige que tenga forma de identificador. */
  it("la M y la L del mismo producto son dos renglones; la M dos veces, no", () => {
    const dos = validarSolicitudPedido({
      slug: "tienda-kantuta",
      items: [
        { productoId: PRODUCTO_ID, varianteId: TALLA_M, cantidad: 1 },
        { productoId: PRODUCTO_ID, varianteId: TALLA_L, cantidad: 2 },
      ],
      idempotencia: IDEMPOTENCIA,
    });
    expect(dos.correcto).toBe(true);
    if (dos.correcto) {
      expect(dos.datos.items).toEqual([
        { productoId: PRODUCTO_ID, varianteId: TALLA_M, cantidad: 1 },
        { productoId: PRODUCTO_ID, varianteId: TALLA_L, cantidad: 2 },
      ]);
    }

    expect(
      validarSolicitudPedido({
        slug: "tienda-kantuta",
        items: [
          { productoId: PRODUCTO_ID, varianteId: TALLA_M, cantidad: 1 },
          { productoId: PRODUCTO_ID, varianteId: TALLA_M, cantidad: 1 },
        ],
        idempotencia: IDEMPOTENCIA,
      }).correcto,
    ).toBe(false);
  });

  it("una presentación que no es un identificador se rechaza; vacía es «sin presentación»", () => {
    expect(
      validarSolicitudPedido({
        slug: "tienda-kantuta",
        items: [{ productoId: PRODUCTO_ID, varianteId: "M", cantidad: 1 }],
        idempotencia: IDEMPOTENCIA,
      }).correcto,
    ).toBe(false);

    const vacia = validarSolicitudPedido({
      slug: "tienda-kantuta",
      items: [{ productoId: PRODUCTO_ID, varianteId: "", cantidad: 1 }],
      idempotencia: IDEMPOTENCIA,
    });
    expect(vacia.correcto && vacia.datos.items[0].varianteId).toBeNull();
  });

  it("valida celulares bolivianos solo cuando fueron informados", () => {
    expect(normalizarTelefonoCliente("")).toBeNull();
    expect(normalizarTelefonoCliente("+591 6123 4567")).toBe("59161234567");
    expect(normalizarTelefonoCliente("12345678")).toBeUndefined();
  });
});

describe("número de mesa", () => {
  const base = {
    slug: "sabor-camba",
    items: [{ productoId: "11111111-1111-4111-8111-111111111111", cantidad: 1 }],
    idempotencia: "22222222-2222-4222-8222-222222222222",
  };

  it("acepta un nombre de mesa corto", () => {
    const resultado = validarSolicitudPedido({ ...base, numeroMesa: " Terraza " });
    expect(resultado.correcto && resultado.datos.numeroMesa).toBe("Terraza");
  });

  it("trata el vacío como sin mesa", () => {
    const resultado = validarSolicitudPedido({ ...base, numeroMesa: "  " });
    expect(resultado.correcto && resultado.datos.numeroMesa).toBe(null);
    const ausente = validarSolicitudPedido(base);
    expect(ausente.correcto && ausente.datos.numeroMesa).toBe(null);
  });

  it("rechaza una mesa demasiado larga", () => {
    const resultado = validarSolicitudPedido({ ...base, numeroMesa: "12345678901" });
    expect(resultado.correcto).toBe(false);
  });
});
