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
  /* "HH:MM:SS" en hora de Bolivia. Nulo: aplica todo el día. */
  hora_inicio?: string | null;
  hora_fin?: string | null;
  /* 0 = domingo, como `extract(dow)` en la base. Nulo: todos los días. */
  dias?: number[] | null;
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

/* Bolivia no cambia de hora en todo el año, así que el desfase es fijo. Se
   escribe explícito porque el servidor corre en UTC: sin esto, una promoción de
   almuerzo de 12:00 a 14:00 se activaría a las 08:00 de la mañana.

   Este cálculo es el espejo de `private.calcular_precio_producto`. Los dos tienen
   que decir lo mismo: uno pinta el precio en el catálogo y el otro es el que se
   cobra al reservar el pedido. Si divergen, el comprador ve un precio y paga
   otro. */
const HORAS_DETRAS_DE_UTC = 4;

type RelojBolivia = { minutos: number; dia: number; diaAnterior: number };

function relojBolivia(fecha: Date): RelojBolivia {
  const local = new Date(fecha.getTime() - HORAS_DETRAS_DE_UTC * 60 * 60 * 1000);
  const dia = local.getUTCDay();
  return {
    minutos: local.getUTCHours() * 60 + local.getUTCMinutes(),
    dia,
    diaAnterior: (dia + 6) % 7,
  };
}

function minutosDesdeHora(valor: string | null | undefined) {
  if (typeof valor !== "string") return null;
  const partes = /^(\d{2}):(\d{2})/.exec(valor);
  if (!partes) return null;
  const horas = Number(partes[1]);
  const minutos = Number(partes[2]);
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
}

export function promocionAplicaAhora(
  promocion: PromocionPrecio,
  fecha: Date = new Date(),
) {
  const inicio = minutosDesdeHora(promocion.hora_inicio);
  const fin = minutosDesdeHora(promocion.hora_fin);
  const reloj = relojBolivia(fecha);
  /* Una sola hora no define ninguna ventana; la base lo prohibe con un check y
     acá se ignora en vez de inventar un límite. */
  const ventana = inicio !== null && fin !== null && inicio !== fin;
  const cruzaMedianoche = ventana && inicio > fin;

  if (ventana) {
    const dentro = cruzaMedianoche
      ? reloj.minutos >= inicio || reloj.minutos < fin
      : reloj.minutos >= inicio && reloj.minutos < fin;
    if (!dentro) return false;
  }

  if (!Array.isArray(promocion.dias) || promocion.dias.length === 0) return true;

  /* En una ventana que cruza la medianoche, la madrugada cuenta como el día
     anterior: «viernes de 22:00 a 02:00» es una noche, no dos ventanas sueltas,
     y a la 01:00 del sábado sigue siendo la del viernes. */
  const diaEfectivo =
    cruzaMedianoche && reloj.minutos < (fin as number) ? reloj.diaAnterior : reloj.dia;
  return promocion.dias.includes(diaEfectivo);
}

export function promocionEstaVigente(
  promocion: PromocionPrecio,
  fecha: Date = new Date(),
) {
  if (!promocion.activo || Number.isNaN(fecha.getTime())) return false;
  const inicio = fechaValida(promocion.fecha_inicio);
  const fin = fechaValida(promocion.fecha_fin);
  if (inicio === undefined || fin === undefined) return false;
  if (inicio && inicio > fecha) return false;
  if (fin && fecha >= fin) return false;
  return promocionAplicaAhora(promocion, fecha);
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
