/* El filtro de estado de la lista de Productos, en la dirección.
 *
 * Vive en `?filtro=` para que se pueda llegar a él con un enlace: Inicio manda
 * a «los que no tienen precio» con `?filtro=sin-precio` (fase 14). Los demás
 * valores también se escriben ahí al elegirlos, así que recargar la pantalla
 * deja el mismo filtro. Lo que no se reconoce es «todos». */
export const FILTROS_ESTADO_PRODUCTO = ["todos", "visibles", "ocultos", "sin-precio"] as const;
export type FiltroEstadoProducto = (typeof FILTROS_ESTADO_PRODUCTO)[number];

export const PARAMETRO_FILTRO = "filtro";

export function leerFiltroEstado(valor: unknown): FiltroEstadoProducto {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return (FILTROS_ESTADO_PRODUCTO as readonly unknown[]).includes(texto)
    ? (texto as FiltroEstadoProducto)
    : "todos";
}

/* La dirección de la lista con ese filtro. «Todos» no se escribe: es la
   dirección de siempre. */
export function rutaConFiltro(ruta: string, filtro: FiltroEstadoProducto): string {
  return filtro === "todos" ? ruta : `${ruta}?${PARAMETRO_FILTRO}=${filtro}`;
}
