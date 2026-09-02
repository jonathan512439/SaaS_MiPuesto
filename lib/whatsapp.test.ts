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
      { nombre: "Bolso", precio: 95, cantidad: 2 },
      { nombre: "Tarjeta", precio: 5, cantidad: 1 },
    ]);

    expect(mensaje).toContain("2 × Bolso: Bs 190");
    expect(mensaje).toContain("1 × Tarjeta: Bs 5");
    expect(mensaje).toContain("Subtotal publicado: Bs 195");
  });
});
