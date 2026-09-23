/* Los límites del nivel gratuito de Google.
 *
 * **Google no los publica por API**: se comprobó que la respuesta no trae
 * ninguna cabecera de cuota, y no hay un endpoint que diga cuánto queda. Así que
 * viven acá, escritos a mano, y hay que copiarlos de la pantalla de AI Studio
 * —«Rate limits» del modelo— cuando cambien.
 *
 * Poner cero en cualquiera de los tres significa «no sé cuánto es» y el medidor
 * muestra el número medido sin barra. Un límite inventado sería peor que
 * ninguno: se decide con él.
 */
export const LIMITES_GEMINI = {
  /* Pedidos por minuto. */
  porMinuto: 15,
  /* Pedidos por día. Google reinicia este contador a la medianoche del
     Pacífico, no a la de Bolivia: son cuatro horas de diferencia en las que el
     sistema sigue rechazando aunque acá ya sea otro día. */
  porDia: 500,
  /* Tokens por minuto. */
  tokensPorMinuto: 250_000,
} as const;

/* Copiados de AI Studio el 2026-09-07, del proyecto MiPuestoApi, para
 * `gemini-3.5-flash-lite`, que es el modelo que usa `lib/ia/gemini.ts`.
 *
 * Hasta esa fecha `porDia` decía 1000: era el doble del real, y con ese número
 * el medidor habría dicho «vas por la mitad» al llegar al tope.
 *
 * El modelo importa más de lo que parece. En la misma pantalla, `gemini-3.6
 * flash` tiene **20 pedidos por día** contra los 500 de este. Se eligió éste por
 * velocidad —2,5 segundos contra 22— y resultó tener veinticinco veces más
 * cuota diaria. Cambiar de modelo sin mirar esta columna dejaría la herramienta
 * inutilizable en media mañana.
 *
 * Medido el mismo día con trece lecturas reales de producto: entre 1.316 y 1.348
 * tokens por llamada, mediana 1.339, ningún fallo. Con esa cifra el límite de
 * tokens por minuto **nunca es el que frena**: quince llamadas, que es el tope
 * del minuto, consumen unos 20.000 de los 250.000 disponibles. El que frena es
 * el diario. */
export const TOKENS_MEDIDOS_POR_LECTURA = 1_339;

/* Se reparte el 80 % del día y no el 100 %: el resto queda para los reintentos,
 * para las pruebas del operador en AI Studio —que gastan la misma cuota sin
 * pasar por acá— y para no quedar exactamente al borde. */
const PARTE_REPARTIDA = 0.8;

/* Lo que se puede comprometer por día sumando todos los negocios: el 80 % de la
 * cuota de Google. Es contra este número que Plataforma mide «si todos gastaran
 * hoy su día entero», y el que avisa cuándo hay que pasar al nivel pago.
 *
 * Reemplaza al tope de diez negocios con la herramienta. La lectura de fotos
 * viene con el plan desde el 23 de septiembre de 2026, así que no se puede
 * bloquear al undécimo cliente: lo que se controla es la suma de lo vendido. */
export const CUOTA_REPARTIBLE_POR_DIA = Math.floor(LIMITES_GEMINI.porDia * PARTE_REPARTIDA);

/* El techo diario de un solo negocio, sea cual sea su plan: cuarenta. Era la
 * cuota repartida entre diez negocios; quedó fijo porque ya no hay un número de
 * negocios que la divida. Está muy por encima de lo que se vende —Catálogo lee
 * tres por día y Activo quince— y existe para acotar un accidente: un negocio
 * con un bucle no puede llevarse la décima parte del día de todos. */
export const TOPE_FOTOS_POR_DIA = 40;

/* El mensual es una promesa comercial, no una restricción técnica: diez negocios
 * por doscientas son dos mil al mes contra las quince mil que da el nivel
 * gratuito. Acota el accidente —un bucle mal escrito— y define qué se vende. */
export const TOPE_FOTOS_POR_MES = 200;

export type VentanaUso = { llamadas: number; tokens: number };

export type UsoPorNegocio = {
  negocio_id: string;
  nombre: string;
  hoy: number;
  tokens_hoy: number;
  mes: number;
  tokens_mes: number;
  cantidad_dia: number;
};

export type UsoIa = {
  minuto: VentanaUso;
  hora: VentanaUso;
  dia_cuota: VentanaUso;
  dia_bolivia: VentanaUso;
  mes: VentanaUso;
  treinta_dias: VentanaUso;
  /* El día más cargado del último mes. Un promedio bajo con un pico alto sigue
     siendo un problema, y el promedio solo no lo muestra. */
  pico_diario: number;
  tokens_por_llamada: number;
  fallidas_hoy: number;
  fallidas_treinta_dias: number;
  por_herramienta: Record<string, number>;
  por_negocio: UsoPorNegocio[];
  negocios_habilitados: number;
  ultima: string | null;
  reinicio_dia_cuota: string;
  medido_en: string;
};

export type NivelUsoIa = "holgado" | "atencion" | "critico";

export function nivelDeUsoIa(valor: number, limite: number): NivelUsoIa {
  if (limite <= 0) return "holgado";
  const proporcion = valor / limite;
  if (proporcion >= 0.9) return "critico";
  if (proporcion >= 0.6) return "atencion";
  return "holgado";
}

export function porcentajeDeUso(valor: number, limite: number): number {
  if (limite <= 0) return 0;
  return Math.min(100, Math.round((valor / limite) * 1000) / 10);
}

/* Cuánto falta para que el contador diario vuelva a cero, en palabras. Un
   «vuelve a las 04:00» no le dice nada a alguien que está mirando el reloj a
   las nueve de la noche. */
export function faltaParaReinicio(reinicio: string, ahora: Date = new Date()): string {
  const restante = new Date(reinicio).getTime() - ahora.getTime();
  if (!Number.isFinite(restante) || restante <= 0) return "en cualquier momento";
  const horas = Math.floor(restante / 3_600_000);
  const minutos = Math.round((restante % 3_600_000) / 60_000);
  if (horas === 0) return `en ${minutos} minuto(s)`;
  if (minutos === 0) return `en ${horas} hora(s)`;
  return `en ${horas} h ${minutos} min`;
}
