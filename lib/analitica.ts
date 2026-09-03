export const TIPOS_EVENTO_ANALITICA = [
  "vista_catalogo",
  "clic_whatsapp",
  "clic_producto",
] as const;

export type TipoEventoAnalitica = (typeof TIPOS_EVENTO_ANALITICA)[number];

export type EventoAnalitica = {
  negocioId: string;
  tipo: TipoEventoAnalitica;
  sesionId: string;
  productoId: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validarEventoAnalitica(valor: unknown): EventoAnalitica | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const datos = valor as Record<string, unknown>;
  const productoId = datos.productoId === null || datos.productoId === undefined
    ? null
    : datos.productoId;

  if (
    typeof datos.negocioId !== "string" ||
    !UUID.test(datos.negocioId) ||
    typeof datos.sesionId !== "string" ||
    !UUID.test(datos.sesionId) ||
    typeof datos.tipo !== "string" ||
    !TIPOS_EVENTO_ANALITICA.includes(datos.tipo as TipoEventoAnalitica) ||
    (productoId !== null && (typeof productoId !== "string" || !UUID.test(productoId)))
  ) {
    return null;
  }

  if (datos.tipo === "clic_producto" && productoId === null) return null;
  if (datos.tipo !== "clic_producto" && productoId !== null) return null;

  return {
    negocioId: datos.negocioId,
    tipo: datos.tipo as TipoEventoAnalitica,
    sesionId: datos.sesionId,
    productoId,
  };
}
