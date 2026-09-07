/* Cuándo vuelve el cupo diario, en hora de Bolivia y en palabras.
 *
 * Vive aparte de `servidor.ts` porque es una función pura y ese archivo arrastra
 * `server-only`: dejarla ahí la volvía imposible de probar sin levantar medio
 * entorno.
 *
 * El contador diario de Google vuelve a cero a la medianoche del Pacífico, que
 * en Bolivia son las tres o cuatro de la madrugada según la época del año. Decir
 * «mañana» mandaría a esperar de más o de menos según a qué hora se tocó el
 * tope. */
export function describirReinicio(reinicio: string | undefined): string {
  if (!reinicio) return "cuando vuelva a empezar el día";
  const fecha = new Date(reinicio);
  if (Number.isNaN(fecha.getTime())) return "cuando vuelva a empezar el día";
  return `desde las ${new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha)}`;
}
