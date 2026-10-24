import { cupoDelPlan, esPrueba } from "../planes";
import { TOPE_FOTOS_POR_DIA } from "./limites";

/* Cuántas lecturas con IA le quedan a un negocio, dicho igual en cada pantalla
 * que las gasta.
 *
 * Antes cada pantalla armaba su frase: el formulario de producto decía «te
 * quedan X de Y este mes», la carga desde foto «llevas X de Y este mes», la
 * revisión en lote no decía nada, y las dos primeras le hablaban de meses a
 * quien está en la prueba, que trae sus lecturas en total. Ahora la cuenta y
 * las palabras salen de acá, y el número que se usa es el mismo que cobra el
 * servidor (`leerLecturasUsadas` y `cupoDelPlan`).
 *
 * Es código común, sin acceso a datos: lo usan las páginas del servidor y los
 * componentes del navegador, que restan una lectura apenas la gastan para que
 * el contador no siga mostrando la que ya se usó. */

export type CupoDeLecturas = {
  quedan: number;
  total: number;
  /* La prueba trae sus lecturas en total, no por mes (`PLAN_PRUEBA`). */
  prueba: boolean;
};

export function cupoDeLecturas(planId: string | null | undefined, usadas: number): CupoDeLecturas {
  const total = cupoDelPlan(planId, TOPE_FOTOS_POR_DIA).mensual;
  /* Nunca baja de cero: el servidor corta antes, y un número negativo se
     leería como una deuda. */
  return { quedan: Math.max(0, total - usadas), total, prueba: esPrueba(planId) };
}

/* Una lectura menos, después de una respuesta correcta del servidor. Si la
   lectura falla, el servidor la devuelve, y por eso solo se resta al acertar. */
export function gastarLectura(cupo: CupoDeLecturas): CupoDeLecturas {
  return { ...cupo, quedan: Math.max(0, cupo.quedan - 1) };
}

/* «este mes» o «de tu prueba», para cerrar la frase del contador. */
export function periodoDeLecturas(cupo: CupoDeLecturas): string {
  return cupo.prueba ? "de tu prueba" : "este mes";
}

/* Qué pasa cuando se acaban, que es lo único que sirve decir en cero. */
export function cuandoVuelvenLasLecturas(cupo: CupoDeLecturas): string {
  return cupo.prueba ? "Al elegir tu plan, tienes más cada mes." : "Vuelven el día 1.";
}

/* La frase entera, para donde no cabe el contador con su formato. */
export function describirLecturasQueQuedan(cupo: CupoDeLecturas): string {
  const frase = `Te ${cupo.quedan === 1 ? "queda 1" : `quedan ${cupo.quedan}`} de ${cupo.total} lecturas con IA ${periodoDeLecturas(cupo)}.`;
  return cupo.quedan === 0 ? `${frase} ${cuandoVuelvenLasLecturas(cupo)}` : frase;
}
