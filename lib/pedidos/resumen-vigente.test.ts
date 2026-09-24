import { describe, expect, it } from "vitest";

import { resumenSigueVigente } from "./resumen-vigente";

const FIRMA = "prod-1:2|prod-2:1";

describe("el resumen de una reserva", () => {
  it("no está antes de reservar", () => {
    expect(
      resumenSigueVigente({ entregado: false, firmaCarrito: FIRMA, firmaPedido: null, hayItems: true }),
    ).toBe(false);
  });

  it("está mientras el carrito siga siendo el que se reservó", () => {
    expect(
      resumenSigueVigente({ entregado: false, firmaCarrito: FIRMA, firmaPedido: FIRMA, hayItems: true }),
    ).toBe(true);
  });

  /* Si el comprador cambia una cantidad, el pedido reservado ya no es lo que
     está mirando: seguir mostrándolo le haría creer que reservó otra cosa. */
  it("se va si el comprador cambia el carrito antes de irse", () => {
    expect(
      resumenSigueVigente({
        entregado: false,
        firmaCarrito: "prod-1:3",
        firmaPedido: FIRMA,
        hayItems: true,
      }),
    ).toBe(false);
  });

  /* El caso que faltaba y que provocaba el error: al vaciar el carrito después
     de pasar a WhatsApp, el código de la reserva desaparecía con él. */
  it("sigue después de irse a WhatsApp, con el carrito ya vacío", () => {
    expect(
      resumenSigueVigente({ entregado: true, firmaCarrito: "", firmaPedido: FIRMA, hayItems: false }),
    ).toBe(true);
  });

  /* Y si vuelve a agregar algo, arranca un pedido nuevo: mostrar el resumen del
     anterior encima de un carrito distinto es la forma de que alguien pague dos
     veces la misma reserva. */
  it("se va cuando vuelve a agregar productos", () => {
    expect(
      resumenSigueVigente({
        entregado: true,
        firmaCarrito: "prod-9:1",
        firmaPedido: FIRMA,
        hayItems: true,
      }),
    ).toBe(false);
  });

  /* Un carrito vacío sin haber pedido nada no muestra ningún resumen: sin esta
     condición, el vacío de «todavía no elige» se confundiría con el de «ya
     pide». */
  it("no aparece con el carrito vacío si nunca se entregó nada", () => {
    expect(
      resumenSigueVigente({ entregado: false, firmaCarrito: "", firmaPedido: FIRMA, hayItems: false }),
    ).toBe(false);
  });
});
