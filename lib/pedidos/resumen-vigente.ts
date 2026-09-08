/* Cuándo sigue a la vista el resumen de una reserva.
 *
 * Tres estados que parecen dos y por eso se confunden:
 *
 * 1. El carrito tiene lo mismo que se reservó → el resumen vale, y si el
 *    comprador cambia una cantidad deja de valer, porque el pedido ya no
 *    coincide con lo que está mirando.
 * 2. El carrito está vacío **porque el comprador se fue a WhatsApp con su
 *    código** → el resumen tiene que seguir, es el único lugar donde está el
 *    número de la reserva.
 * 3. El carrito está vacío porque no eligió nada → no hay nada que mostrar.
 *
 * El segundo caso no existía, y de ahí salía el error: al vaciar el carrito
 * después del pedido, el código de la reserva desaparecía con él. La alternativa
 * era no vaciarlo, que es lo que pasaba antes: el comprador volvía al catálogo y
 * encontraba su pedido todavía adentro, como si no hubiera pasado nada.
 */
export function resumenSigueVigente({
  entregado,
  firmaCarrito,
  firmaPedido,
  hayItems,
}: {
  /* El comprador ya abrió WhatsApp con el código en la mano. */
  entregado: boolean;
  firmaCarrito: string;
  /* La del pedido reservado. Vacía si todavía no hay pedido. */
  firmaPedido: string | null;
  hayItems: boolean;
}): boolean {
  if (firmaPedido === null) return false;
  if (firmaPedido === firmaCarrito) return true;
  return entregado && !hayItems;
}
