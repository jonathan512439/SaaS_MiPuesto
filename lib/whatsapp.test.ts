import { describe, expect, it } from "vitest";

import {
  construirEnlaceWhatsapp,
  construirMensajePedido,
  construirMensajeProducto,
  normalizarTelefonoWhatsappPublico,
} from "./whatsapp";

describe("enlaces de WhatsApp", () => {
  it("normaliza un celular boliviano y codifica el mensaje", () => {
    const mensaje = construirMensajeProducto("Mi Tienda", {
      nombre: "Bolso tejido",
      precio: 95,
    });
    const enlace = construirEnlaceWhatsapp("71234567", mensaje);
    const url = new URL(enlace ?? "");

    expect(normalizarTelefonoWhatsappPublico("+591 7123-4567")).toBe("59171234567");
    expect(url.origin).toBe("https://wa.me");
    expect(url.pathname).toBe("/59171234567");
    expect(url.searchParams.get("text")).toContain("Bolso tejido");
    expect(url.searchParams.get("text")).toContain("Bs 95");
  });

  it("rechaza números o mensajes inválidos", () => {
    expect(construirEnlaceWhatsapp("123", "Hola")).toBeNull();
    expect(construirEnlaceWhatsapp("71234567", "   ")).toBeNull();
  });

  it("consolida cantidades y subtotal del carrito", () => {
    const mensaje = construirMensajePedido("Tienda Kantuta", [
      { codigo: "PRD-BOLSO1", nombre: "Bolso", precio: 95, cantidad: 2 },
      { nombre: "Tarjeta", precio: 5, cantidad: 1 },
    ], "PED-ABC12345");

    expect(mensaje).toContain("Código de reserva: PED-ABC12345");
    expect(mensaje).toContain("2 × Bolso (PRD-BOLSO1): Bs 190");
    expect(mensaje).toContain("1 × Tarjeta: Bs 5");
    expect(mensaje).toContain("Total reservado: Bs 195");
  });
});

describe("mesa en el mensaje de pedido", () => {
  /* El mozo que lee el mensaje en el celular necesita saber a dónde llevarlo
     antes que qué lleva. */
  it("nombra la mesa antes del detalle", () => {
    const mensaje = construirMensajePedido(
      "Sabor Camba",
      [{ nombre: "Silpancho", precio: 38, cantidad: 1 }],
      "PED-1",
      " 5 ",
    );
    const lineas = mensaje.split(String.fromCharCode(10));
    expect(lineas[2]).toBe("Mesa: 5.");
    expect(lineas[3]).toContain("Silpancho");
  });

  it("no menciona la mesa cuando no la hay", () => {
    const mensaje = construirMensajePedido(
      "Sabor Camba",
      [{ nombre: "Silpancho", precio: 38, cantidad: 1 }],
      "PED-1",
      "   ",
    );
    expect(mensaje).not.toContain("Mesa");
  });
});
