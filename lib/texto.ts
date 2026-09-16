/* Comparar lo que alguien escribió con lo que hay guardado.
 *
 * Quien busca «cafe» tiene que encontrar «Café», y quien escribe «CAMISA» tiene
 * que encontrar «camisa». Nadie pone las tildes cuando busca apurado, y menos en
 * un teléfono.
 *
 * Vive suelto acá porque lo usan los dos lados —el catálogo público, donde la
 * comparación la hace Postgres contra `texto_busqueda`, y el panel, donde la
 * hace el navegador sobre la lista que ya tiene—. Estaba escrito dos veces, y el
 * comentario de la segunda copia decía «igual que en el catálogo público», que
 * es una copia confesando que lo es: el día que una de las dos aprendiera a
 * ignorar la «ñ» o los guiones, buscar lo mismo daría resultados distintos según
 * en qué pantalla se buscara.
 */
export function normalizarBusqueda(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
