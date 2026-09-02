import { formatearPrecioBolivianos } from "./precios";

type ProductoParaWhatsapp = {
  nombre: string;
  precio: number;
};

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
    `Precio publicado: ${formatearPrecioBolivianos(producto.precio)}.`,
    "Quisiera pedirlo o agendarlo por WhatsApp.",
  ].join("\n");
}

export function construirMensajePedido(negocio: string, items: ItemPedidoWhatsapp[]) {
  const validos = items.filter(
    (item) =>
      item.nombre.trim() &&
      Number.isFinite(item.precio) &&
      item.precio >= 0 &&
      Number.isInteger(item.cantidad) &&
      item.cantidad > 0,
  );
  if (validos.length === 0) return "";

  const total = validos.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  return [
    `Hola, preparé este pedido en el catálogo de ${negocio}:`,
    ...validos.map(
      (item) =>
        `- ${item.cantidad} × ${item.nombre}: ${formatearPrecioBolivianos(
          item.precio * item.cantidad,
        )}`,
    ),
    `Subtotal publicado: ${formatearPrecioBolivianos(total)}.`,
    "Quisiera confirmar disponibilidad y coordinar el pedido.",
  ].join("\n");
}
