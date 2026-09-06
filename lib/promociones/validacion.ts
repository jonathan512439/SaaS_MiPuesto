import { esUuid } from "../catalogo/validacion";
import type { TipoPromocion } from "../precios";

export const LIMITE_PROMOCIONES = 100;

export type DatosPromocionValidados = {
  tipo: TipoPromocion;
  valor: number;
  producto_id: string | null;
  categoria_id: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activo: boolean;
  hora_inicio: string | null;
  hora_fin: string | null;
  dias: number[] | null;
};

type ResultadoValidacion =
  | { correcto: true; datos: DatosPromocionValidados }
  | { correcto: false; errores: Record<string, string> };

function normalizarFecha(valor: unknown) {
  if (valor === undefined || valor === null || valor === "") return null;
  if (typeof valor !== "string") return undefined;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? undefined : fecha.toISOString();
}

/* "HH:MM" es lo que entrega un `<input type="time">`. Se guarda con segundos
   porque la columna es `time` y así lo que se lee de vuelta coincide con lo que
   se escribió, sin sorpresas al comparar. */
function normalizarHora(valor: unknown) {
  if (valor === undefined || valor === null || valor === "") return null;
  if (typeof valor !== "string") return undefined;
  const partes = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(valor.trim());
  return partes ? `${partes[1]}:${partes[2]}:00` : undefined;
}

function normalizarDias(valor: unknown) {
  if (valor === undefined || valor === null) return null;
  if (!Array.isArray(valor)) return undefined;
  const dias = [...new Set(valor.map(Number))].sort((a, b) => a - b);
  if (dias.length === 0) return null;
  if (dias.some((dia) => !Number.isInteger(dia) || dia < 0 || dia > 6)) return undefined;
  return dias;
}

export function validarPromocion(entrada: unknown): ResultadoValidacion {
  const datos =
    typeof entrada === "object" && entrada !== null && !Array.isArray(entrada)
      ? (entrada as Record<string, unknown>)
      : {};
  const tipo = datos.tipo;
  const valor =
    typeof datos.valor === "string" && datos.valor.trim()
      ? Number(datos.valor.replace(",", "."))
      : Number(datos.valor);
  const destino = datos.destino;
  const destinoId = datos.destino_id;
  const fechaInicio = normalizarFecha(datos.fecha_inicio);
  const fechaFin = normalizarFecha(datos.fecha_fin);
  const horaInicio = normalizarHora(datos.hora_inicio);
  const horaFin = normalizarHora(datos.hora_fin);
  const dias = normalizarDias(datos.dias);
  const errores: Record<string, string> = {};

  if (tipo !== "porcentaje" && tipo !== "monto_fijo") {
    errores.tipo = "Elige un tipo de descuento válido.";
  }
  if (!Number.isFinite(valor) || valor <= 0) {
    errores.valor = "Escribe un descuento mayor a cero.";
  } else if (tipo === "porcentaje" && valor > 100) {
    errores.valor = "El porcentaje no puede superar 100 %.";
  } else if (Math.round(valor * 100) !== valor * 100) {
    errores.valor = "Usa como máximo dos decimales.";
  }

  if ((destino !== "producto" && destino !== "categoria") || !esUuid(destinoId)) {
    errores.destino_id = "Elige un producto o una categoría de tu negocio.";
  }
  if (fechaInicio === undefined) errores.fecha_inicio = "La fecha de inicio no es válida.";
  if (fechaFin === undefined) errores.fecha_fin = "La fecha de finalización no es válida.";
  if (
    typeof fechaInicio === "string" &&
    typeof fechaFin === "string" &&
    new Date(fechaFin) <= new Date(fechaInicio)
  ) {
    errores.fecha_fin = "La finalización debe ser posterior al inicio.";
  }

  if (horaInicio === undefined || horaFin === undefined) {
    errores.horario = "Escribí las horas en formato 24 h, como 12:00.";
  } else if ((horaInicio === null) !== (horaFin === null)) {
    /* Una sola hora no define ninguna ventana, y la base lo rechaza con un
       check: se avisa acá para que el dueño lea algo que entiende. */
    errores.horario = "Completá la hora de inicio y la de fin, o dejá las dos vacías.";
  } else if (horaInicio !== null && horaInicio === horaFin) {
    errores.horario = "El inicio y el fin no pueden ser la misma hora.";
  }

  if (dias === undefined) {
    errores.dias = "Elegí días de la semana válidos.";
  }

  if (Object.keys(errores).length > 0) return { correcto: false, errores };

  return {
    correcto: true,
    datos: {
      tipo: tipo as TipoPromocion,
      valor,
      producto_id: destino === "producto" ? (destinoId as string) : null,
      categoria_id: destino === "categoria" ? (destinoId as string) : null,
      fecha_inicio: fechaInicio as string | null,
      fecha_fin: fechaFin as string | null,
      activo: datos.activo !== false,
      hora_inicio: horaInicio as string | null,
      hora_fin: horaFin as string | null,
      dias: dias as number[] | null,
    },
  };
}
