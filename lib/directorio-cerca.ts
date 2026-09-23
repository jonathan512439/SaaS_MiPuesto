/* «Cerca de mí», redondeado.
 *
 * Dos decimales: alrededor de un kilómetro. Es lo que sale del navegador y lo
 * que queda en la dirección, así que no dice dónde vive nadie; y redondeado,
 * dos vecinos piden la misma dirección.
 *
 * Vive aparte de `lib/directorio.ts` porque lo usa el botón, que corre en el
 * navegador: importarlo de allá arrastraría la consulta a la base al teléfono
 * de cada visitante.
 */
export function redondearCerca(lat: number, lng: number) {
  return { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 };
}
