/* El nombre de quien atiende: «Dra. Paola», «Consultorio 2».
 *
 * Vive acá y no en la ruta porque lo usan los dos lados: la ruta lo valida
 * antes de guardar, y el panel lo usa para no ofrecer un «Cambiar nombre» que
 * el servidor rechazaría o que no cambia nada.
 */

export const LARGO_MAXIMO_NOMBRE_RECURSO = 60;

export function limpiarNombreDeRecurso(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const nombre = valor.trim().replace(/\s+/g, " ");
  return nombre.length >= 1 && nombre.length <= LARGO_MAXIMO_NOMBRE_RECURSO ? nombre : null;
}

/* El nombre a guardar, o `null` si no hay nada que guardar. El rubro siembra a
   quien atiende con el nombre de la categoría —«Consultas»— y lo normal es
   cambiarlo una vez por el de la persona. */
export function nombreParaRenombrar(actual: string, escrito: string): string | null {
  const nombre = limpiarNombreDeRecurso(escrito);
  return nombre && nombre !== actual ? nombre : null;
}
