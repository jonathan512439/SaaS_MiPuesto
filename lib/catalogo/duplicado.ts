import { LARGO_MAXIMO_NOMBRE_PRODUCTO } from "./validacion";

const SUFIJO = " (copia)";

/* El nombre de la copia tiene que seguir entrando en el límite del campo, así
   que si hace falta se recorta el nombre y no el sufijo: sin el sufijo, dos
   productos idénticos en la lista son indistinguibles. */
export function nombreDeCopia(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, " ");
  const espacio = LARGO_MAXIMO_NOMBRE_PRODUCTO - SUFIJO.length;
  return `${limpio.slice(0, Math.max(1, espacio)).trim()}${SUFIJO}`;
}
