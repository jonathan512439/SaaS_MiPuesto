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
    },
  };
}
