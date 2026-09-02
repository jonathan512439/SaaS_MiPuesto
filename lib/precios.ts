const FORMATEADOR_BOLIVIANOS = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatearPrecioBolivianos(precio: number) {
  return `Bs ${FORMATEADOR_BOLIVIANOS.format(precio)}`;
}
