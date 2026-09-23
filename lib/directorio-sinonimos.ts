import { normalizarBusqueda } from "./texto";

/* Un sinónimo del buscador, limpio. Fase 12.
 *
 * El término y sus equivalentes se guardan como llega una búsqueda ya
 * normalizada: en minúscula, sin tildes y sin signos. Si se guardaran como los
 * escribió el administrador —«Juguetes», «muñeca»— no coincidirían nunca con lo
 * que busca la gente, que llega normalizado.
 */
export const MAXIMO_EQUIVALENTES = 12;

export function normalizarPalabra(valor: string): string {
  return normalizarBusqueda(valor)
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function leerSinonimo(
  termino: unknown,
  equivalentes: unknown,
): { correcto: true; termino: string; equivalentes: string[] } | { correcto: false; error: string } {
  const limpio = normalizarPalabra(String(termino ?? ""));
  if (limpio.length < 2 || limpio.length > 40) {
    return { correcto: false, error: "La palabra va de 2 a 40 letras." };
  }
  const lista = (Array.isArray(equivalentes) ? equivalentes : String(equivalentes ?? "").split(","))
    .map((palabra) => normalizarPalabra(String(palabra)))
    .filter((palabra) => palabra.length >= 2 && palabra.length <= 40 && palabra !== limpio);
  const unicos = [...new Set(lista)];
  if (unicos.length === 0) return { correcto: false, error: "Escribí al menos una palabra equivalente." };
  if (unicos.length > MAXIMO_EQUIVALENTES) {
    return { correcto: false, error: `Hasta ${MAXIMO_EQUIVALENTES} palabras equivalentes.` };
  }
  return { correcto: true, termino: limpio, equivalentes: unicos };
}
