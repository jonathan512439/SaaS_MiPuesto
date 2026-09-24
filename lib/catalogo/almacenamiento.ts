import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../supabase/database.types";

/* El espacio de fotos de cada negocio.
 *
 * El tope lo hace cumplir la base —una regla restrictiva de Storage, migración
 * `20261026090000`—, y este número es el mismo: una prueba compara los dos.
 * Acá está para lo que la base no hace: avisar **antes** de llegar, y decir con
 * palabras qué pasa cuando se llega, en vez de un «no se pudo subir».
 */
export const TOPE_ALMACENAMIENTO_BYTES = 150 * 1024 * 1024;

/* Desde qué parte del tope se avisa. Al 80 % todavía queda lugar para unas
   trescientas fotos: tiempo de sobra para ordenar. */
export const AVISO_DESDE = 0.8;

export type NivelDeEspacio = "holgado" | "poco" | "lleno";

export function nivelDeEspacio(usados: number): NivelDeEspacio {
  if (usados >= TOPE_ALMACENAMIENTO_BYTES) return "lleno";
  if (usados >= TOPE_ALMACENAMIENTO_BYTES * AVISO_DESDE) return "poco";
  return "holgado";
}

function megas(bytes: number): string {
  const valor = bytes / (1024 * 1024);
  return valor.toLocaleString("es-BO", { maximumFractionDigits: valor < 10 ? 1 : 0 });
}

/* «4,8 MB de 150 MB». */
export function describirEspacio(usados: number): string {
  return `${megas(usados)} MB de ${megas(TOPE_ALMACENAMIENTO_BYTES)} MB`;
}

export const MENSAJE_SIN_ESPACIO = `Llegaste al espacio de fotos de tu negocio (${megas(
  TOPE_ALMACENAMIENTO_BYTES,
)} MB). Borra fotos de productos que ya no vendes para subir nuevas.`;

export const MENSAJE_POCO_ESPACIO =
  "Te queda poco espacio para fotos. Borra las de productos que ya no vendes antes de que se llene.";

/* Lo que ocupa el negocio, preguntado a la base. `null` si no se pudo saber:
   en ese caso no se frena nada desde acá, y la regla de la base decide. */
export async function leerEspacioUsado(
  supabase: SupabaseClient<Database>,
  negocioId: string,
): Promise<number | null> {
  const { data, error } = await supabase.rpc("uso_almacenamiento_negocio", { p_carpeta: negocioId });
  if (error || data === null || data === undefined) return null;
  return Number(data);
}

/* Para las rutas que suben: si ya no hay lugar, lo dicen antes de subir. */
export async function sinEspacioParaFotos(
  supabase: SupabaseClient<Database>,
  negocioId: string,
): Promise<boolean> {
  const usados = await leerEspacioUsado(supabase, negocioId);
  return usados !== null && nivelDeEspacio(usados) === "lleno";
}

/* Si la subida falló porque la regla de la base la rechazó —alguien llegó al
   tope entre la comprobación y la subida—, se dice lo mismo. */
export function esRechazoPorEspacio(mensaje: string | undefined): boolean {
  return Boolean(mensaje && /row-level security|violates row level|policy/i.test(mensaje));
}
