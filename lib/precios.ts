const FORMATEADOR_BOLIVIANOS = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatearPrecioBolivianos(precio: number) {
  return `Bs ${FORMATEADOR_BOLIVIANOS.format(precio)}`;
}

export function calcularSubtotal(
  items: Array<{ precio: number; cantidad: number }>,
) {
  const centavos = items.reduce((suma, item) => {
    if (
      !Number.isFinite(item.precio) ||
      item.precio < 0 ||
      !Number.isInteger(item.cantidad) ||
      item.cantidad <= 0
    ) {
      return suma;
    }
    return suma + Math.round(item.precio * 100) * item.cantidad;
  }, 0);

  return centavos / 100;
}
