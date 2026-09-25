import { normalizarBusqueda } from "../texto";

export const PRODUCTOS_PUBLICOS_POR_PAGINA = 12;
export const LARGO_MAXIMO_BUSQUEDA = 60;
export const MAXIMO_TERMINOS = 5;

export type FiltrosCatalogo = {
  categoria: string;
  busqueda: string;
  pagina: number;
};

/* Vive en `lib/texto.ts` desde que el panel necesito la misma: estaba escrita
   dos veces, y buscar lo mismo podia dar resultados distintos segun la pantalla.
   Se sigue exportando desde aca porque es donde el catalogo publico la busca. */
export { normalizarBusqueda } from "../texto";

function primerValor(valor: string | string[] | undefined) {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

/* Los términos llegan de la barra de direcciones, así que se recortan a letras,
   números y espacios antes de tocar la consulta: `ilike` trata `%` y `_` como
   comodines, y una cadena larga o llena de comodines solo sirve para hacer
   trabajar a la base sin devolver nada útil. */
export function extraerTerminos(busqueda: string): string[] {
  return normalizarBusqueda(busqueda.slice(0, LARGO_MAXIMO_BUSQUEDA))
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAXIMO_TERMINOS);
}

export function leerFiltrosCatalogo(
  parametros: Record<string, string | string[] | undefined>,
  categoriasValidas: ReadonlyArray<{ id: string }>,
): FiltrosCatalogo {
  const categoriaPedida = primerValor(parametros.categoria).trim();
  const categoria = categoriasValidas.some(({ id }) => id === categoriaPedida)
    ? categoriaPedida
    : "";

  const paginaPedida = Number.parseInt(primerValor(parametros.pagina), 10);
  const pagina = Number.isInteger(paginaPedida) && paginaPedida > 0 ? paginaPedida : 1;

  return {
    categoria,
    busqueda: primerValor(parametros.buscar).slice(0, LARGO_MAXIMO_BUSQUEDA),
    pagina,
  };
}

export function calcularRango(pagina: number, porPagina = PRODUCTOS_PUBLICOS_POR_PAGINA) {
  const desde = (pagina - 1) * porPagina;
  return { desde, hasta: desde + porPagina - 1 };
}

export function calcularTotalPaginas(
  total: number,
  porPagina = PRODUCTOS_PUBLICOS_POR_PAGINA,
) {
  return Math.max(1, Math.ceil(total / porPagina));
}

/* La dirección se arma siempre desde cero y no acumulando parámetros: así una
   categoría vieja no sobrevive a una búsqueda nueva, que es el error clásico de
   los catálogos filtrados. */
export function construirRutaCatalogo(slug: string, filtros: Partial<FiltrosCatalogo>) {
  const parametros = new URLSearchParams();
  if (filtros.categoria) parametros.set("categoria", filtros.categoria);
  if (filtros.busqueda?.trim()) parametros.set("buscar", filtros.busqueda.trim());
  if (filtros.pagina && filtros.pagina > 1) parametros.set("pagina", String(filtros.pagina));

  const cadena = parametros.toString();
  return cadena ? `/${slug}?${cadena}` : `/${slug}`;
}

/* «Ver pedido» desde la página de un producto: el catálogo con el pedido ya
   abierto. Antes llevaba al catálogo a secas y el cliente tenía que tocar la
   barra otra vez para ver lo que había elegido.

   No es un filtro —no cambia qué productos se ven—, por eso no pasa por
   `leerFiltrosCatalogo`, y el catálogo lo saca de la dirección apenas abre el
   pedido: recargar o volver atrás no lo reabre. */
const PARAMETRO_PEDIDO = "pedido";
const PEDIDO_ABIERTO = "abierto";

export function construirRutaPedido(slug: string) {
  return `/${slug}?${PARAMETRO_PEDIDO}=${PEDIDO_ABIERTO}`;
}

export function pideAbrirPedido(parametros: Record<string, string | string[] | undefined>) {
  return primerValor(parametros[PARAMETRO_PEDIDO]) === PEDIDO_ABIERTO;
}
