/* Leer un catálogo por tandas, sin que una que falla tumbe a las demás.
 *
 * Cada tanda es una llamada a Google, y Google se satura: el 2026-11-05, medido
 * con un catálogo de prueba, respondió «alta demanda» varias veces seguidas y una
 * tanda se perdió entera después de seis intentos, mientras las otras salieron
 * con todos sus precios bien. Una lectura parcial no es un caso raro: pasa.
 *
 * Por eso se hace la tanda de nuevo al final, cuando el resto ya terminó, y lo
 * que no salga se informa en vez de tirar lo leído. Esta parte no sabe de Google
 * ni del cupo: se prueba con una función de mentira. */

/* De a dos, para no pasar de las quince llamadas por minuto de la cuota
   compartida (`lib/ia/limites.ts`): cada una tarda de diez a veinte segundos. */
const TANDAS_A_LA_VEZ = 2;

const PAUSA_ANTES_DE_REINTENTAR_MS = 3_000;

export async function leerPorTandas<T, R extends { correcto: boolean }>(
  tandas: readonly T[],
  leer: (tanda: T) => Promise<R>,
  esperar: (ms: number) => Promise<void> = (ms) => new Promise((resolver) => setTimeout(resolver, ms)),
): Promise<R[]> {
  const resultados = new Array<R>(tandas.length);
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: Math.min(TANDAS_A_LA_VEZ, tandas.length) }, async () => {
      while (siguiente < tandas.length) {
        const posicion = siguiente;
        siguiente += 1;
        resultados[posicion] = await leer(tandas[posicion]);
      }
    }),
  );

  /* Una sola tanda ya se reintenta adentro de `analizarArchivo`; esto es para
     cuando son varias y vale la pena salvar lo que falta. */
  if (tandas.length > 1) {
    for (const [posicion, resultado] of resultados.entries()) {
      if (resultado.correcto) continue;
      await esperar(PAUSA_ANTES_DE_REINTENTAR_MS);
      resultados[posicion] = await leer(tandas[posicion]);
    }
  }
  return resultados;
}
