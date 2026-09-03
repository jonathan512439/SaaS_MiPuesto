export function calcularCantidadDisponible({
  controlaStock,
  cantidadStock,
  cantidadReservada,
}: {
  controlaStock: boolean;
  cantidadStock: number | null;
  cantidadReservada: number;
}) {
  if (!controlaStock) return null;
  if (!Number.isInteger(cantidadStock) || cantidadStock === null || cantidadStock < 0) return 0;
  if (!Number.isInteger(cantidadReservada) || cantidadReservada < 0) return 0;
  return Math.max(0, cantidadStock - cantidadReservada);
}

export function limitarCantidadReserva(cantidad: number, maximo: number) {
  if (!Number.isFinite(cantidad) || !Number.isInteger(maximo) || maximo < 0) return 0;
  return Math.min(Math.max(0, Math.trunc(cantidad)), Math.min(maximo, 99));
}
