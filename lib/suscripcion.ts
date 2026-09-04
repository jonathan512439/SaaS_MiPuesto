export type EstadoSuscripcion = "vigente" | "por_vencer" | "vencida";

export type Suscripcion = {
  estado: EstadoSuscripcion;
  diasRestantes: number;
  venceEn: Date;
};

/* Una semana de aviso: suficiente para que el dueño escriba y coordine el pago
   sin que su catálogo se apague de un día para el otro. */
export const DIAS_DE_AVISO = 7;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/* Los días se cuentan sobre el día calendario en La Paz y no sobre bloques de
   24 horas: para el dueño, algo que vence mañana vence mañana, sin importar
   que falten 20 o 30 horas. */
function inicioDelDiaEnBolivia(fecha: Date): number {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);

  return Date.parse(`${partes}T00:00:00Z`);
}

export function evaluarSuscripcion(venceEn: string | Date, ahora: Date): Suscripcion {
  const vence = venceEn instanceof Date ? venceEn : new Date(venceEn);
  const diasRestantes = Math.round(
    (inicioDelDiaEnBolivia(vence) - inicioDelDiaEnBolivia(ahora)) / MS_POR_DIA,
  );

  const estado: EstadoSuscripcion =
    vence.getTime() <= ahora.getTime()
      ? "vencida"
      : diasRestantes <= DIAS_DE_AVISO
        ? "por_vencer"
        : "vigente";

  return { estado, diasRestantes, venceEn: vence };
}

export function formatearFechaVencimiento(fecha: Date): string {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

export function describirDiasRestantes(diasRestantes: number): string {
  if (diasRestantes < 0) {
    const dias = Math.abs(diasRestantes);
    return dias === 1 ? "Venció ayer" : `Venció hace ${dias} días`;
  }
  if (diasRestantes === 0) return "Vence hoy";
  if (diasRestantes === 1) return "Vence mañana";
  return `Vence en ${diasRestantes} días`;
}
