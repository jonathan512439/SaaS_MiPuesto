/* Bolivia no cambia de hora en todo el año, así que el desfase es fijo y no
   hace falta una biblioteca de zonas horarias para saber qué día es acá. Se
   escribe explícito porque el servidor corre en UTC: sin esto, entre las 20:00
   y la medianoche boliviana el sistema ya estaría en el día siguiente y la
   carta del día se vaciaría cuatro horas antes de tiempo, en plena cena. */
const HORAS_DETRAS_DE_UTC = 4;

export const CATEGORIA_CARTA_DEL_DIA = "carta-del-dia";
export const NOMBRE_CARTA_DEL_DIA = "Hoy";

export function fechaHoyBolivia(ahora = new Date()): string {
  const enBolivia = new Date(ahora.getTime() - HORAS_DETRAS_DE_UTC * 60 * 60 * 1000);
  return enBolivia.toISOString().slice(0, 10);
}

/* Una fecha y no un interruptor: lo que hay que apagar a mano queda encendido,
   y a los tres días la carta «de hoy» miente sobre lo que se está sirviendo. */
export function estaEnLaCartaDeHoy(enCartaHasta: string | null, ahora = new Date()): boolean {
  if (!enCartaHasta) return false;
  return enCartaHasta >= fechaHoyBolivia(ahora);
}
