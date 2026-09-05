/* La papelera responde al error del cliente, que es un problema distinto del
   respaldo —que responde al mío— y del plazo de guarda de un negocio dado de
   baja, que responde a que dejó de pagar. Tres miedos, tres mecanismos. */
export const DIAS_PAPELERA = 30;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export type ProductoEnPapelera = {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
  fotos: string[];
  eliminado_en: string;
};

/* Cuenta días enteros hacia arriba: mientras quede una hora, quedan «1 día».
   Decirle cero a alguien que todavía puede recuperar su producto lo empuja a no
   intentarlo. */
export function diasRestantesEnPapelera(eliminadoEn: string, ahora = new Date()): number {
  const vence = new Date(eliminadoEn).getTime() + DIAS_PAPELERA * MS_POR_DIA;
  return Math.ceil((vence - ahora.getTime()) / MS_POR_DIA);
}

export function venciEnPapelera(eliminadoEn: string, ahora = new Date()): boolean {
  return diasRestantesEnPapelera(eliminadoEn, ahora) <= 0;
}

export function describirPlazo(eliminadoEn: string, ahora = new Date()): string {
  const dias = diasRestantesEnPapelera(eliminadoEn, ahora);
  if (dias <= 0) return "Se borra en la próxima limpieza";
  if (dias === 1) return "Queda 1 día para recuperarlo";
  return `Quedan ${dias} días para recuperarlo`;
}

/* La fecha de corte se calcula acá y no con `now()` en la base para que la
   prueba pueda fijar el reloj. */
export function fechaDeCorte(ahora = new Date()): string {
  return new Date(ahora.getTime() - DIAS_PAPELERA * MS_POR_DIA).toISOString();
}
