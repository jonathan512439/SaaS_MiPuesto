import { validarHorario, type HorarioNormalizado } from "../horario";
import { validarTopeUnidades } from "../pedidos/tope-unidades";

export type DatosOperacionNegocio = {
  horario: HorarioNormalizado;
  reserva_minutos: number;
  /* Vacío: sin tope propio. Solo lo usa la tienda con carrito, pero se guarda
     igual en cualquier modalidad: el rubro oculta el control, no el dato. */
  tope_unidades_pedido: number | null;
};

export type ResultadoValidacionOperacion =
  | { correcto: true; datos: DatosOperacionNegocio }
  | { correcto: false; errores: Record<string, string> };

export function validarOperacionNegocio(entrada: unknown): ResultadoValidacionOperacion {
  const objeto =
    typeof entrada === "object" && entrada !== null
      ? (entrada as Record<string, unknown>)
      : {};
  const horario = validarHorario(objeto.horario);
  const reservaMinutos =
    typeof objeto.reserva_minutos === "number"
      ? objeto.reserva_minutos
      : Number(objeto.reserva_minutos);
  const errores: Record<string, string> = {};
  const tope = validarTopeUnidades(objeto.tope_unidades_pedido);
  if (!tope.correcto) errores.tope_unidades_pedido = tope.error;

  if (!horario.correcto) errores.horario = horario.error;
  if (!Number.isInteger(reservaMinutos) || reservaMinutos < 5 || reservaMinutos > 1440) {
    errores.reserva_minutos = "Elige un tiempo entre 5 minutos y 24 horas.";
  }

  if (Object.keys(errores).length > 0 || !horario.correcto || !tope.correcto) {
    return { correcto: false, errores };
  }

  return {
    correcto: true,
    datos: {
      horario: horario.horario,
      reserva_minutos: reservaMinutos,
      tope_unidades_pedido: tope.tope,
    },
  };
}
