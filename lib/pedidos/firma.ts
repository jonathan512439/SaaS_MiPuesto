/* Identifica una selección concreta del carrito. El catálogo y el carrito la
   calculan por separado —uno para decidir si sigue mostrando el acceso
   flotante, otro para saber si la reserva creada corresponde a lo que hay en
   pantalla—, así que la fórmula vive en un solo lugar. */
export function construirFirmaCarrito(cantidades: Record<string, number>): string {
  return Object.entries(cantidades)
    .filter(([, cantidad]) => cantidad > 0)
    .map(([productoId, cantidad]) => `${productoId}:${cantidad}`)
    .sort()
    .join("|");
}
