import { calcularSubtotal, formatearPrecioBolivianos } from "./precios";

type ProductoParaWhatsapp = {
  codigo?: string;
  nombre: string;
  precio: number;
  /* Los datos propios del producto, ya formateados: «Potencia: 9 W». Son los
     que el dueño marcó para que viajen en el pedido, y son la diferencia entre
     que le llegue «2 × Foco LED» y que le llegue con la potencia y el casquillo.
     Sin esto, quien recibe el pedido tiene que volver a preguntar. */
  datos?: ReadonlyArray<{ nombre: string; texto: string }>;
};

/* Los datos de un producto en una línea aparte, sangrada bajo su renglón.
 *
 * Sangrada y no pegada al nombre porque en WhatsApp el renglón se corta solo: un
 * nombre largo más cuatro datos daría tres renglones sin principio claro. Con la
 * sangría se ve de un vistazo qué pertenece a qué. */
function lineaDeDatos(producto: ProductoParaWhatsapp) {
  const partes = (producto.datos ?? [])
    .filter(({ nombre, texto }) => nombre.trim() !== "" && texto.trim() !== "")
    .map(({ nombre, texto }) => `${nombre}: ${texto}`);
  return partes.length > 0 ? [`  ${partes.join(" · ")}`] : [];
}

export type ItemPedidoWhatsapp = ProductoParaWhatsapp & {
  cantidad: number;
};

export function normalizarTelefonoWhatsappPublico(telefono: string) {
  const digitos = telefono.replace(/\D/g, "");
  return digitos.length === 8 ? `591${digitos}` : digitos;
}

export function construirEnlaceWhatsapp(telefono: string, mensaje: string) {
  const numero = normalizarTelefonoWhatsappPublico(telefono);
  if (!/^591[67]\d{7}$/.test(numero) || !mensaje.trim()) return null;

  const url = new URL(`https://wa.me/${numero}`);
  url.searchParams.set("text", mensaje.trim());
  return url.toString();
}

export function construirMensajeProducto(
  negocio: string,
  producto: ProductoParaWhatsapp,
) {
  return [
    `Hola, vi ${producto.nombre} en el catálogo de ${negocio}.`,
    ...lineaDeDatos(producto),
    `Precio publicado: ${formatearPrecioBolivianos(producto.precio)}.`,
    "Quisiera pedirlo o agendarlo por WhatsApp.",
  ].join("\n");
}

export function construirMensajePedido(
  negocio: string,
  items: ItemPedidoWhatsapp[],
  codigoPedido?: string,
  numeroMesa?: string | null,
) {
  const validos = items.filter(
    (item) =>
      item.nombre.trim() &&
      Number.isFinite(item.precio) &&
      item.precio >= 0 &&
      Number.isInteger(item.cantidad) &&
      item.cantidad > 0,
  );
  if (validos.length === 0) return "";

  const total = calcularSubtotal(validos);
  return [
    `Hola, preparé este pedido en el catálogo de ${negocio}:`,
    ...(codigoPedido ? [`Código de reserva: ${codigoPedido}.`] : []),
    /* Antes del detalle: el mozo que lee el mensaje en el celular necesita
       saber a dónde llevarlo antes que qué lleva. */
    ...(numeroMesa?.trim() ? [`Mesa: ${numeroMesa.trim()}.`] : []),
    ...validos.flatMap((item) => [
      `- ${item.cantidad} × ${item.nombre}${item.codigo ? ` (${item.codigo})` : ""}: ${formatearPrecioBolivianos(
        calcularSubtotal([item]),
      )}`,
      ...lineaDeDatos(item),
    ]),
    `Total reservado: ${formatearPrecioBolivianos(total)}.`,
    "Quisiera coordinar la entrega y el pago.",
  ].join("\n");
}
