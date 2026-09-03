const FORMATEADOR_BOLIVIANOS = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export type TipoPromocion = "porcentaje" | "monto_fijo";

export type PromocionPrecio = {
  id?: string;
  tipo: string;
  valor: number;
  producto_id: string | null;
  categoria_id: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activo: boolean;
};

export type PrecioCalculado = {
  precioOriginal: number;
  precioFinal: number;
  ahorro: number;
  promocion: PromocionPrecio | null;
};

function redondearMoneda(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function fechaValida(valor: string | null) {
  if (valor === null) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? undefined : fecha;
}

export function promocionEstaVigente(
  promocion: PromocionPrecio,
  fecha: Date = new Date(),
) {
  if (!promocion.activo || Number.isNaN(fecha.getTime())) return false;
  const inicio = fechaValida(promocion.fecha_inicio);
  const fin = fechaValida(promocion.fecha_fin);
  if (inicio === undefined || fin === undefined) return false;
  return (!inicio || inicio <= fecha) && (!fin || fecha < fin);
}

function calcularPrecioConUnaPromocion(
  precioOriginal: number,
  promocion: PromocionPrecio,
) {
  const valor = Number(promocion.valor);
  if (!Number.isFinite(valor) || valor <= 0) return precioOriginal;
  if (promocion.tipo === "porcentaje") {
    if (valor > 100) return precioOriginal;
    return redondearMoneda(precioOriginal * (1 - valor / 100));
  }
  if (promocion.tipo === "monto_fijo") {
    return redondearMoneda(Math.max(0, precioOriginal - valor));
  }
  return precioOriginal;
}

export function calcularPrecioProducto(
  precioBase: number,
  destino: { productoId: string; categoriaId: string | null },
  promociones: PromocionPrecio[],
  fecha: Date = new Date(),
): PrecioCalculado {
  const precioOriginal = Number.isFinite(precioBase)
    ? redondearMoneda(Math.max(0, precioBase))
    : 0;
  const candidatas = promociones
    .filter(
      (promocion) =>
        promocionEstaVigente(promocion, fecha) &&
        (promocion.producto_id === destino.productoId ||
          (promocion.producto_id === null &&
            promocion.categoria_id !== null &&
            promocion.categoria_id === destino.categoriaId)),
    )
    .map((promocion) => ({
      promocion,
      precio: calcularPrecioConUnaPromocion(precioOriginal, promocion),
    }))
    .filter(({ precio }) => precio < precioOriginal)
    .sort(
      (a, b) =>
        a.precio - b.precio ||
        Number(b.promocion.producto_id !== null) -
          Number(a.promocion.producto_id !== null),
    );
  const mejor = candidatas[0];
  const precioFinal = mejor?.precio ?? precioOriginal;

  return {
    precioOriginal,
    precioFinal,
    ahorro: redondearMoneda(precioOriginal - precioFinal),
    promocion: mejor?.promocion ?? null,
  };
}

export function formatearPrecioBolivianos(precio: number) {
  return `Bs ${FORMATEADOR_BOLIVIANOS.format(precio)}`;
}

export function calcularSubtotal(
  items: Array<{ precio: number; cantidad: number }>,
) {
  const centavos = items.reduce((suma, item) => {
    if (
      !Number.isFinite(item.precio) ||
      item.precio < 0 ||
      !Number.isInteger(item.cantidad) ||
      item.cantidad <= 0
    ) {
      return suma;
    }
    return suma + Math.round(item.precio * 100) * item.cantidad;
  }, 0);

  return centavos / 100;
}
