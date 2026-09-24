import { validarHorario, type HorarioNormalizado } from "../horario";

export type DatosOperacionNegocio = {
  horario: HorarioNormalizado;
  reserva_minutos: number;
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

  if (!horario.correcto) errores.horario = horario.error;
  if (!Number.isInteger(reservaMinutos) || reservaMinutos < 5 || reservaMinutos > 1440) {
    errores.reserva_minutos = "Elegí un tiempo entre 5 minutos y 24 horas.";
  }

  if (Object.keys(errores).length > 0 || !horario.correcto) {
    return { correcto: false, errores };
  }

  return {
    correcto: true,
    datos: {
      horario: horario.horario,
      reserva_minutos: reservaMinutos,
    },
  };
}
