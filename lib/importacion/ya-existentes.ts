/* Los productos de una importación que ya están en el catálogo.
 *
 * Una importación crea los productos de a uno. Si la pestaña se cierra a la
 * mitad —el teléfono se apaga, se va la señal—, los primeros quedan creados y
 * los demás no. Al volver a subir el mismo archivo, antes se creaban todos otra
 * vez y los primeros quedaban duplicados.
 *
 * Ahora los que ya existen **con el mismo nombre** se muestran sin marcar y con
 * una etiqueta: subir el archivo de nuevo sigue desde donde quedó. Sirve igual
 * para quien importa dos veces la misma lista sin darse cuenta.
 *
 * Se compara por nombre, sin tildes, mayúsculas ni espacios de más. No por
 * categoría: la categoría de destino se decide en la revisión, después de
 * esto. Quedan sin marcar, no se ocultan: si de verdad es otro producto con el
 * mismo nombre, el dueño lo marca y se crea.
 */

export function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* Las posiciones de los productos leídos cuyo nombre ya está en el catálogo. */
export function posicionesYaExistentes(
  leidos: ReadonlyArray<{ nombre: string }>,
  nombresDelCatalogo: ReadonlyArray<string>,
): Set<number> {
  const existentes = new Set(nombresDelCatalogo.map(normalizarNombre));
  const posiciones = new Set<number>();
  leidos.forEach(({ nombre }, posicion) => {
    if (existentes.has(normalizarNombre(nombre))) posiciones.add(posicion);
  });
  return posiciones;
}
