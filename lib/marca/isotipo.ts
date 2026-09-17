/* La geometría del isotipo de MiPuesto, en un solo lugar.
 *
 * La dibujan dos cosas que no se parecen en nada: el componente de React que va
 * en la barra del panel y en el pie del sitio, y el lienzo que arma el QR del
 * catálogo, que necesita la misma figura como imagen para usarla de marca de
 * agua.
 *
 * Están acá y no copiadas en los dos porque **no son un adorno: son una medida**.
 * El comentario del componente lo dice: la geometría se sacó del PNG original
 * píxel por píxel —los bordes de cada trazo, los picos de las ondas, el radio de
 * las esquinas—. Una segunda copia se corrige una vez y se olvida la otra, y
 * entonces el logotipo de la barra y el del QR dejan de ser el mismo dibujo.
 */

/* El tamaño exacto del archivo original: es lo que hace que las proporciones
   sean las mismas y no «parecidas». */
export const ISOTIPO_VIEWBOX = "0 0 256 325";

/* El grosor es uno solo para los dos trazos. Antes eran 18 y 16, y al lado del
   nombre —que va en peso 900— el símbolo se veía flaco. */
export const ISOTIPO_GROSOR = 22;

/* El toldo. Las tres ondas son curvas cuadráticas y no arcos: el punto de
   control a 149 deja el fondo de cada onda en 122, que es donde estaba en el
   original. */
export const ISOTIPO_TOLDO =
  "M21 95 C21 56 44 23 66 23 L190 23 C212 23 234 56 234 95 Q198.5 149 164 95 Q128 149 92 95 Q56.5 149 21 95 Z";

/* El mostrador. Abierto arriba, con las esquinas de abajo redondeadas. */
export const ISOTIPO_MOSTRADOR =
  "M53 144 V290 a12 12 0 0 0 12 12 h124 a12 12 0 0 0 12 -12 V144";

/* El isotipo como un SVG completo y con un color fijo, para cuando hace falta
   como **imagen** y no como marcado: un lienzo no sabe qué es `currentColor`.
   Se pide el color a quien lo llama, en vez de elegir uno acá, porque el que
   sirve depende de encima de qué se va a dibujar. */
export function svgDeIsotipo(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ISOTIPO_VIEWBOX}" fill="none" stroke="${color}" stroke-width="${ISOTIPO_GROSOR}" stroke-linecap="round" stroke-linejoin="round"><path d="${ISOTIPO_TOLDO}"/><path d="${ISOTIPO_MOSTRADOR}"/></svg>`;
}
