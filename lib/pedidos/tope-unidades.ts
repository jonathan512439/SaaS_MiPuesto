/* El máximo de unidades por pedido que puede poner cada negocio.
 *
 * Quien decide es la base: `crear_pedido_reservado` rechaza con
 * `TOPE_UNIDADES`, y la columna tiene su `check`. Esto es lo que necesitan el
 * panel —validar lo que escribe el dueño— y el carrito —avisar antes de enviar,
 * en vez de dejar que el comprador se entere con un error—.
 *
 * Vacío es «sin tope propio»: el de siempre, 30 renglones de hasta 99. */

/* 30 renglones × 99 unidades: más que eso no se puede pedir de todos modos.
   Es el mismo número del `check` de la migración
   `20261028090000_tope_de_unidades_por_pedido.sql`. */
export const TOPE_UNIDADES_MAXIMO = 2970;

/* Lo que llega de la base, acotado: la fila puede venir de una restauración. */
export function leerTopeUnidades(valor: unknown): number | null {
  if (typeof valor !== "number" || !Number.isInteger(valor)) return null;
  if (valor < 1 || valor > TOPE_UNIDADES_MAXIMO) return null;
  return valor;
}

/* Lo que escribe el dueño en el panel. Vacío quita el tope. */
export function validarTopeUnidades(
  entrada: unknown,
): { correcto: true; tope: number | null } | { correcto: false; error: string } {
  if (entrada === null || entrada === undefined) return { correcto: true, tope: null };
  const texto = typeof entrada === "number" ? String(entrada) : String(entrada).trim();
  if (texto === "") return { correcto: true, tope: null };
  const numero = Number(texto);
  if (!/^\d+$/.test(texto) || numero < 1 || numero > TOPE_UNIDADES_MAXIMO) {
    return {
      correcto: false,
      error: `Escribe un número entre 1 y ${TOPE_UNIDADES_MAXIMO}, o déjalo vacío para no poner tope.`,
    };
  }
  return { correcto: true, tope: numero };
}

export function contarUnidades(renglones: ReadonlyArray<{ cantidad: number }>): number {
  return renglones.reduce((total, renglon) => total + renglon.cantidad, 0);
}

/* El aviso del carrito cuando el pedido pasa el tope. `null` si está bien. */
export function avisoDeTopeUnidades(unidades: number, tope: number | null): string | null {
  if (tope === null || unidades <= tope) return null;
  const sobran = unidades - tope;
  return `Este negocio acepta hasta ${tope} ${tope === 1 ? "unidad" : "unidades"} por pedido. Quita ${sobran} para enviarlo.`;
}
