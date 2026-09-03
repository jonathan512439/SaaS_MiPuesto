export function obtenerInicioResumenSemanal(fecha = new Date()) {
  return new Date(fecha.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
}
