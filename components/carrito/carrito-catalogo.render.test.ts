import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { crearDatosDemoPlantilla } from "../../lib/plantillas/datos-demo";
import { CarritoCatalogo } from "./carrito-catalogo";

/* El formulario del pedido, con y sin los campos que prende el dueño.
 *
 * La mesa y las notas son dos interruptores, y las cuatro combinaciones nadie
 * las abre a mano: el dueño ve la suya. La regla que se cuida es que cada
 * campo aparezca **solo** con su interruptor prendido —un campo de más es una
 * pregunta de más entre el cliente y su pedido— y que los de siempre sigan. */

function dibujar({ pideNumeroMesa = false, pideNotaPedido = false } = {}) {
  const datos = crearDatosDemoPlantilla({
    nombre: "Negocio de prueba",
    descripcion: null,
    telefonoWhatsapp: "70000000",
    tipoNegocio: "tienda_virtual",
  });
  datos.negocio.pideNumeroMesa = pideNumeroMesa;
  datos.negocio.pideNotaPedido = pideNotaPedido;
  const productos = datos.categorias.flatMap((categoria) => categoria.productos);
  const producto = productos[0];
  return renderToString(
    jsx(CarritoCatalogo, {
      datos,
      productos,
      cantidades: { [producto.id]: 1 },
      onCambiarCantidad: () => undefined,
      onAbrirWhatsapp: () => undefined,
      onPedidoReservado: () => undefined,
    }),
  ).replaceAll("<!-- -->", "");
}

describe("el formulario del pedido", () => {
  it("sin interruptores: nombre y celular, sin mesa ni notas", () => {
    const html = dibujar();
    expect(html).toContain('id="pedido-cliente-nombre"');
    expect(html).toContain('id="pedido-cliente-telefono"');
    expect(html).not.toContain('id="pedido-numero-mesa"');
    expect(html).not.toContain('id="pedido-nota"');
  });

  it("con las notas prendidas: el campo, opcional y con su tope", () => {
    const html = dibujar({ pideNotaPedido: true });
    expect(html).toMatch(/<label for="pedido-nota">Notas del pedido <span>Opcional<\/span><\/label>/);
    expect(html).toMatch(/<textarea[^>]*id="pedido-nota"[^>]*maxLength="300"/);
    expect(html).not.toContain('id="pedido-numero-mesa"');
  });

  it("con las dos prendidas, están las dos", () => {
    const html = dibujar({ pideNumeroMesa: true, pideNotaPedido: true });
    expect(html).toContain('id="pedido-numero-mesa"');
    expect(html).toContain('id="pedido-nota"');
  });
});
