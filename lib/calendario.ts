/* Las cuentas del calendario del panel, sin pantalla.
 *
 * Las fechas viajan como texto `AAAA-MM-DD` —el día del negocio, en Bolivia—
 * y se calculan en UTC a propósito: así ningún cambio de hora del navegador
 * del dueño corre un día. Bolivia no cambia de hora; el navegador sí puede
 * estar configurado en otra zona.
 *
 * Reemplaza a los calendarios del navegador (`type="date"`), que mostraban la
 * fecha a la estadounidense —«10/15/2026»—, la hora con AM y PM, y se veían
 * distinto en cada teléfono. Pedido por el dueño el 2026-10-14.
 */

export const NOMBRES_MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

const NOMBRES_DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;

/* La semana empieza el lunes, como en cualquier almanaque de acá. */
export const INICIALES_SEMANA = ["L", "M", "M", "J", "V", "S", "D"] as const;

export type DiaDelCalendario = {
  fecha: string;
  numero: number;
  /* Si es del mes que se está mirando o de las puntas, para completar la semana. */
  delMes: boolean;
};

function fechaUtc(fecha: string): Date {
  return new Date(`${fecha}T00:00:00Z`);
}

function aTexto(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function esFecha(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(fechaUtc(valor).getTime());
}

export function sumarDias(fecha: string, dias: number): string {
  const resultado = fechaUtc(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return aTexto(resultado);
}

/* El primer día de un mes, `mes` de 0 a 11, desbordando a otro año si hace falta. */
export function primeroDelMes(anio: number, mes: number): string {
  return aTexto(new Date(Date.UTC(anio, mes, 1)));
}

export function mesDe(fecha: string): { anio: number; mes: number } {
  const dia = fechaUtc(fecha);
  return { anio: dia.getUTCFullYear(), mes: dia.getUTCMonth() };
}

/* Las semanas completas que muestran un mes: de lunes a domingo, con los días
   de los meses vecinos para que la primera y la última semana no queden
   cortadas. Cinco o seis semanas, según el mes. */
export function semanasDelMes(anio: number, mes: number): DiaDelCalendario[][] {
  const primero = fechaUtc(primeroDelMes(anio, mes));
  /* Cuántos días hay que retroceder hasta el lunes: domingo (0) son seis. */
  const retroceso = (primero.getUTCDay() + 6) % 7;
  let dia = sumarDias(aTexto(primero), -retroceso);
  const semanas: DiaDelCalendario[][] = [];
  do {
    const semana: DiaDelCalendario[] = [];
    for (let posicion = 0; posicion < 7; posicion += 1) {
      const actual = fechaUtc(dia);
      semana.push({ fecha: dia, numero: actual.getUTCDate(), delMes: actual.getUTCMonth() === mes });
      dia = sumarDias(dia, 1);
    }
    semanas.push(semana);
  } while (fechaUtc(dia).getUTCMonth() === mes);
  return semanas;
}

export function tituloDelMes(anio: number, mes: number): string {
  const { anio: real, mes: mesReal } = mesDe(primeroDelMes(anio, mes));
  return `${NOMBRES_MESES[mesReal]} de ${real}`;
}

/* «jueves 15 de octubre», y el año solo si no es el de `referencia`. */
export function fechaParaLeer(fecha: string, referencia?: string): string {
  const dia = fechaUtc(fecha);
  const anio = dia.getUTCFullYear();
  const mostrarAnio = referencia ? fechaUtc(referencia).getUTCFullYear() !== anio : false;
  return `${NOMBRES_DIAS[dia.getUTCDay()]} ${dia.getUTCDate()} de ${NOMBRES_MESES[dia.getUTCMonth()]}${mostrarAnio ? ` de ${anio}` : ""}`;
}

/* Las horas del día en 24 horas —«09:00», «14:30»—, cada `paso` minutos. En
   Bolivia nadie dice «2:30 PM»: el calendario del navegador lo hacía. */
export function horasDelDia(paso = 15): string[] {
  const horas: string[] = [];
  for (let minutos = 0; minutos < 24 * 60; minutos += paso) {
    horas.push(`${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`);
  }
  return horas;
}

/* La primera letra en mayúscula, para cuando la fecha abre un renglón:
   «Jueves 15 de octubre». En el texto y no en el CSS: el proyecto no
   transforma mayúsculas desde las hojas de estilo. */
export function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/* Si un día se puede elegir, con los topes opcionales de antes y después. */
export function diaElegible(fecha: string, minimo?: string, maximo?: string): boolean {
  if (minimo && fecha < minimo) return false;
  if (maximo && fecha > maximo) return false;
  return true;
}
