import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../supabase/database.types";
import { COLUMNAS_PRODUCTO_ADMIN } from "./columnas";
import type { ProductoCatalogo } from "./tipos";

/* Los productos del panel, de a tandas a partir de cierta cantidad.
 *
 * La pantalla de Productos filtra, busca y pagina en el navegador, y para eso
 * tiene todos los productos a mano. Mandarlos de una sola vez no escala: en el
 * plan gratuito de Workers, una portada de veinte productos ya llegó a dar 503
 * por CPU, y Supabase además corta cada consulta en mil filas sin avisar. Con
 * esto, lo que arma el servidor nunca pasa de una tanda: el resto lo pide el
 * navegador en pedidos chicos, y filtrar y buscar siguen viendo todo.
 *
 * Cien, porque la lista muestra diez por página (diez páginas de entrada) y
 * ningún negocio con un catálogo común se entera: se decidió el 2026-11-05,
 * cuando el más grande tenía 53. */
export const PRODUCTOS_POR_TANDA = 100;

/* Con el `id` de desempate: dos productos con el mismo orden y la misma fecha
   —una importación los crea así— podrían cambiar de lugar entre una tanda y la
   siguiente, y uno se repetiría mientras otro se pierde. */
export function consultarTandaDeProductos(supabase: SupabaseClient<Database>, negocioId: string, desde: number) {
  return supabase
    .from("productos")
    .select(COLUMNAS_PRODUCTO_ADMIN, { count: "exact" })
    .eq("negocio_id", negocioId)
    .is("eliminado_en", null)
    .order("orden")
    .order("creado_en")
    .order("id")
    .range(desde, desde + PRODUCTOS_POR_TANDA - 1);
}

/* Suma una tanda sin repetir: mientras se trae el resto, el dueño puede haber
   creado o editado alguno, y lo que tiene en pantalla es lo más nuevo. */
export function sumarTanda(actuales: readonly ProductoCatalogo[], tanda: readonly ProductoCatalogo[]) {
  const presentes = new Set(actuales.map(({ id }) => id));
  return [...actuales, ...tanda.filter(({ id }) => !presentes.has(id))];
}

/* `desde` viene en la dirección: lo que no sea un entero se trata como el comienzo. */
export function leerDesde(valor: string | null): number {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 0 ? numero : 0;
}
