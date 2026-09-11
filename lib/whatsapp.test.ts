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

describe("los datos propios del producto en el mensaje", () => {
  const datos = [
    { nombre: "Potencia", texto: "9 W" },
    { nombre: "Casquillo", texto: "E27" },
  ];

  it("viajan en el mensaje de un producto suelto", () => {
    const mensaje = construirMensajeProducto("Ferretería El Sol", {
      nombre: "Foco LED",
      precio: 45,
      datos,
    });
    expect(mensaje).toContain("Potencia: 9 W · Casquillo: E27");
  });

  /* Es lo que convierte el pedido en algo que se puede preparar sin volver a
     preguntar. Sin esto llega «2 × Foco LED» y el dueño no sabe cuál de los
     ocho focos que vende. */
  it("viajan debajo de su renglón en el pedido", () => {
    const mensaje = construirMensajePedido("Ferretería El Sol", [
      { nombre: "Foco LED", precio: 45, cantidad: 2, datos },
      { nombre: "Cinta aislante", precio: 12, cantidad: 1 },
    ]);
    const lineas = mensaje.split("\n");
    const renglonFoco = lineas.findIndex((linea) => linea.includes("Foco LED"));
    expect(lineas[renglonFoco + 1]).toContain("Potencia: 9 W");
    /* El que no tiene datos no deja una línea vacía detrás. */
    expect(mensaje).not.toContain("\n  \n");
  });

  it("un producto sin datos se ve igual que antes", () => {
    const mensaje = construirMensajePedido("Ferretería El Sol", [
      { nombre: "Cinta aislante", precio: 12, cantidad: 1 },
    ]);
    expect(mensaje).toContain("- 1 × Cinta aislante");
    expect(mensaje.split("\n").filter((linea) => linea.startsWith("  "))).toHaveLength(0);
  });

  it("descarta un dato a medias en vez de escribir «: »", () => {
    const mensaje = construirMensajeProducto("Ferretería El Sol", {
      nombre: "Foco LED",
      precio: 45,
      datos: [{ nombre: "Potencia", texto: "  " }, { nombre: "", texto: "E27" }],
    });
    expect(mensaje).not.toContain(":  ");
    expect(mensaje).not.toContain(": E27");
  });
});
