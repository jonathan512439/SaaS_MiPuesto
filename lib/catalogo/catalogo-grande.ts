import { construirEnlaceContacto } from "../contacto";
import { CARGA_AMPLIA, CARGA_INICIAL, PLANES, PRODUCTOS_MAXIMOS_EN_PLANES, planDe } from "../planes";

/* Qué se le ofrece a quien tiene más productos de los que entran, o un archivo
 * que no se puede leer.
 *
 * Nunca termina en «no se puede»: siempre hay un paso siguiente. Hasta
 * `PRODUCTOS_MAXIMOS_EN_PLANES` es un plan más grande; más que eso, una
 * conversación por WhatsApp en la que se acuerda el precio según la cantidad
 * (decisión del dueño del proyecto, 2026-11-05). Los números salen de
 * `lib/planes.ts`, y los mensajes llevan la cantidad cuando se sabe: con eso la
 * charla arranca con un dato y no con una pregunta. */

const conCantidad = (productos?: number) => (productos ? `, de unos ${productos} productos` : "");

export const enlaceCargaPorNosotros = (productos?: number) =>
  construirEnlaceContacto(`Hola, quiero que me carguen el catálogo${conCantidad(productos)}. Les paso mi PDF y mis fotos.`);

export const enlaceCatalogoAMedida = (productos?: number) =>
  construirEnlaceContacto(
    `Hola, tengo un catálogo grande${conCantidad(productos)} y quiero acordar un precio a medida.`,
  );

/* El precio de la carga en una frase, igual en todas las pantallas. */
export const PRECIOS_DE_CARGA = `Bs ${CARGA_INICIAL.precioBs} hasta ${CARGA_INICIAL.productosMaximos} productos y Bs ${CARGA_AMPLIA.precioBs} hasta ${CARGA_AMPLIA.productosMaximos}, con sus fotos.`;

export type PasoSiguiente = { texto: string; accion: string; enlace: string };

/* Qué se le propone a quien leyó más productos de los que entran en su plan.
   `total` es lo que tendría en el catálogo con todo lo leído. */
export function pasoSiguiente(planId: string, total: number): PasoSiguiente | null {
  if (total <= planDe(planId).topes.productos) return null;
  if (total > PRODUCTOS_MAXIMOS_EN_PLANES) {
    return {
      texto: `Para catálogos de más de ${PRODUCTOS_MAXIMOS_EN_PLANES} productos armamos un precio a medida, según tu cantidad.`,
      accion: "Hablar de mi catálogo",
      enlace: enlaceCatalogoAMedida(total),
    };
  }
  const plan = PLANES.find(({ topes }) => topes.productos >= total) ?? PLANES[PLANES.length - 1];
  return {
    texto: `Con el plan ${plan.nombre} entran ${plan.topes.productos}.`,
    accion: `Pasar al plan ${plan.nombre}`,
    enlace: construirEnlaceContacto(
      `Hola, mi catálogo tiene ${total} productos y quiero pasar al plan ${plan.nombre}.`,
    ),
  };
}
