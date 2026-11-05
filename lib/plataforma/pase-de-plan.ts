import { esPrueba, planDe } from "../planes";
import { formatearFechaVencimiento } from "../suscripcion";

/* El aviso de sacar un negocio de la prueba a mano, con el selector de plan.
 *
 * Cambiar el plan no registra un pago ni mueve el vencimiento: eso solo lo hace
 * «Renovar». El 2026-10-24, Mochilas pasó de prueba a Catálogo con el selector
 * y quedó figurando en un plan pago, sumando al ingreso del mes, con el
 * vencimiento de sus quince días de prueba. El cambio sigue permitido —la
 * plataforma puede tener un motivo—, pero se hace sabiéndolo.
 *
 * Devuelve `null` cuando no hay nada que avisar. */
export function avisoDePaseManual(
  nombre: string,
  planActual: string,
  planNuevo: string,
  venceEn: string,
): { titulo: string; descripcion: string } | null {
  if (!esPrueba(planActual) || esPrueba(planNuevo)) return null;
  return {
    titulo: `Pasar ${nombre} al plan ${planDe(planNuevo).nombre} sin registrar un pago`,
    descripcion: `Esto no registra ningún pago ni mueve el vencimiento: sigue venciendo el ${formatearFechaVencimiento(new Date(venceEn))} y, si nadie lo renueva, su catálogo se baja al vencer. Si ya pagó, usa «Renovar».`,
  };
}
