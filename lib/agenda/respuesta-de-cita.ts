import { formatearPrecioBolivianos } from "../precios";
import { construirEnlaceWhatsapp } from "../whatsapp";
import { describirCita } from "./horarios";

/* Lo que se le responde a quien reserva, armado siempre desde la cita guardada.
 *
 * Son tres caminos —la reserva nueva, el reintento después de un corte y el
 * doble toque que choca con su propia cita— y antes cada uno armaba su
 * respuesta: el reintento no traía el enlace de WhatsApp, así que el turno
 * quedaba apartado sin abrir la conversación con el negocio, y el choque
 * devolvía la hora pedida en vez de la guardada. Lo encontró la auditoría del
 * 2026-09-30. Una sola función, con lo guardado, no puede volver a separarse.
 */

export type CitaGuardada = {
  codigo: string;
  /* El comienzo de la cita como lo guarda la base. */
  inicio: string;
  nombre_cliente: string;
  nota: string | null;
};

export function respuestaDeCita(
  cita: CitaGuardada,
  producto: { nombre: string; precio: number },
  negocio: { nombre: string; telefono_whatsapp: string },
) {
  const cuando = describirCita(cita.inicio);
  const mensaje = [
    `Hola, agendé ${producto.nombre} en el catálogo de ${negocio.nombre}.`,
    `Cuándo: ${cuando}.`,
    `Precio publicado: ${formatearPrecioBolivianos(producto.precio)}.`,
    `Código: ${cita.codigo}.`,
    `A nombre de: ${cita.nombre_cliente}.`,
    ...(cita.nota ? [`Nota: ${cita.nota}.`] : []),
  ].join("\n");

  return {
    cita: { codigo: cita.codigo, inicio: cita.inicio, cuando },
    enlaceWhatsapp: construirEnlaceWhatsapp(negocio.telefono_whatsapp, mensaje),
  };
}

/* Si un intento repetido es de verdad la misma reserva: el mismo servicio a la
   misma hora. Un identificador reusado para otra cosa no devuelve la cita de
   otro pedido. La hora se compara como instante, no como texto: la base y el
   navegador la escriben distinto. */
export function esLaMismaReserva(
  guardada: { producto_id: string | null; inicio: string },
  pedida: { productoId: string; inicio: string },
): boolean {
  return (
    guardada.producto_id === pedida.productoId &&
    new Date(guardada.inicio).getTime() === new Date(pedida.inicio).getTime()
  );
}
