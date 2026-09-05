export const DIAS_SEMANA_REPORTE = 7;
/* Tope de filas que se traen para ordenar los productos más vistos. Una semana
   de un negocio muy visitado no llega a esto, y si llegara conviene un resumen
   en la base antes que una consulta que crece sin techo. */
export const MAXIMO_EVENTOS_LEIDOS = 5000;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export function obtenerInicioResumenSemanal(fecha = new Date()) {
  return new Date(fecha.getTime() - DIAS_SEMANA_REPORTE * MS_POR_DIA).toISOString();
}

export type RangoReporte = {
  desde: string;
  hasta: string;
};

/* Dos ventanas del mismo largo, pegadas: sin la anterior, un número suelto no
   dice nada. «240 visitas» no se sabe si está bien; «240, un 30 % más que la
   semana pasada» sí. */
export function obtenerVentanasSemanales(fecha = new Date()): {
  actual: RangoReporte;
  previa: RangoReporte;
} {
  const fin = fecha.getTime();
  const inicio = fin - DIAS_SEMANA_REPORTE * MS_POR_DIA;
  const inicioPrevio = inicio - DIAS_SEMANA_REPORTE * MS_POR_DIA;

  return {
    actual: { desde: new Date(inicio).toISOString(), hasta: new Date(fin).toISOString() },
    previa: {
      desde: new Date(inicioPrevio).toISOString(),
      hasta: new Date(inicio).toISOString(),
    },
  };
}

export type Tendencia = {
  diferencia: number;
  porcentaje: number | null;
  sentido: "sube" | "baja" | "igual";
};

/* Sin semana previa no hay porcentaje que calcular, y decir «+100 %» cuando se
   pasó de cero a uno es inventar una tendencia donde solo hay un estreno. */
export function calcularTendencia(actual: number, previo: number): Tendencia {
  const diferencia = actual - previo;
  const sentido = diferencia > 0 ? "sube" : diferencia < 0 ? "baja" : "igual";
  const porcentaje =
    previo === 0 ? null : Math.round((diferencia / previo) * 100);

  return { diferencia, porcentaje, sentido };
}

export function describirTendencia(tendencia: Tendencia): string {
  if (tendencia.sentido === "igual") return "Igual que la semana pasada";
  const signo = tendencia.sentido === "sube" ? "+" : "−";
  const magnitud = Math.abs(tendencia.diferencia);

  if (tendencia.porcentaje === null) {
    return `${signo}${magnitud} · la semana pasada no hubo`;
  }
  return `${signo}${magnitud} · ${signo}${Math.abs(tendencia.porcentaje)} % vs la semana pasada`;
}

/* Cuenta apariciones por producto y devuelve los primeros. En memoria y no en
   la base porque una semana de eventos entra de sobra y evita una función más
   que mantener; si algún día no entrara, el tope de arriba lo delata. */
export function contarPorProducto(
  eventos: Array<{ producto_id: string | null }>,
  limite = 5,
): Array<{ productoId: string; total: number }> {
  const conteo = new Map<string, number>();

  for (const { producto_id } of eventos) {
    if (!producto_id) continue;
    conteo.set(producto_id, (conteo.get(producto_id) ?? 0) + 1);
  }

  return [...conteo.entries()]
    .map(([productoId, total]) => ({ productoId, total }))
    .sort((a, b) => b.total - a.total || a.productoId.localeCompare(b.productoId))
    .slice(0, limite);
}
