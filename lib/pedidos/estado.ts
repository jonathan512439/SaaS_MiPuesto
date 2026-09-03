export const ESTADOS_PEDIDO = [
  "pendiente",
  "confirmado",
  "cancelado",
  "expirado",
] as const;

export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

const ETIQUETAS: Record<EstadoPedido, string> = {
  pendiente: "Por confirmar",
  confirmado: "Venta confirmada",
  cancelado: "Cancelado",
  expirado: "Reserva vencida",
};

const FORMATEADOR_FECHA = new Intl.DateTimeFormat("es-BO", {
  timeZone: "America/La_Paz",
  dateStyle: "short",
  timeStyle: "short",
  hourCycle: "h23",
});

export function esEstadoPedido(valor: unknown): valor is EstadoPedido {
  return ESTADOS_PEDIDO.includes(valor as EstadoPedido);
}

export function etiquetaEstadoPedido(estado: EstadoPedido) {
  return ETIQUETAS[estado];
}

export function formatearFechaPedido(fecha: string | null) {
  if (!fecha) return "Sin fecha";
  const valor = new Date(fecha);
  return Number.isNaN(valor.getTime()) ? "Fecha no disponible" : FORMATEADOR_FECHA.format(valor);
}
