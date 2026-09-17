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

/* El toldo, en las piezas que lo componen.
 *
 * Es un solo trazo cerrado —así se dibuja en la barra, en el pie y en el QR—,
 * pero la animación de entrada lo arma parte por parte: primero el techo y
 * después las tres ondas, de derecha a izquierda, siguiendo el mismo recorrido
 * que traza el techo. Para eso necesita cada tramo por separado.
 *
 * Están separados **acá** y no copiados en la animación porque son la misma
 * medida: `ISOTIPO_TOLDO` se arma con estos pedazos, así que no pueden
 * discrepar. Una prueba comprueba que el trazo compuesto sea exactamente el que
 * se sacó del PNG original. */
const TECHO = "M21 95 C21 56 44 23 66 23 L190 23 C212 23 234 56 234 95";
const ONDAS_SEGUIDAS = "Q198.5 149 164 95 Q128 149 92 95 Q56.5 149 21 95";

/* Las tres ondas son curvas cuadráticas y no arcos: el punto de control a 149
   deja el fondo de cada onda en 122, que es donde estaba en el original. */
export const ISOTIPO_TOLDO = `${TECHO} ${ONDAS_SEGUIDAS} Z`;

/* El mostrador. Abierto arriba, con las esquinas de abajo redondeadas. */
export const ISOTIPO_MOSTRADOR =
  "M53 144 V290 a12 12 0 0 0 12 12 h124 a12 12 0 0 0 12 -12 V144";

/* Las cinco piezas, en el orden en que se dibujan. Cada onda arranca donde
   termina la anterior, así que encadenadas se leen como un solo movimiento. */
export const ISOTIPO_PIEZAS = [
  { nombre: "mostrador", trazo: ISOTIPO_MOSTRADOR },
  { nombre: "techo", trazo: TECHO },
  { nombre: "ondaPrimera", trazo: "M234 95 Q198.5 149 164 95" },
  { nombre: "ondaSegunda", trazo: "M164 95 Q128 149 92 95" },
  { nombre: "ondaTercera", trazo: "M92 95 Q56.5 149 21 95" },
] as const;

/* El isotipo como un SVG completo y con un color fijo, para cuando hace falta
   como **imagen** y no como marcado: un lienzo no sabe qué es `currentColor`.
   Se pide el color a quien lo llama, en vez de elegir uno acá, porque el que
   sirve depende de encima de qué se va a dibujar. */
export function svgDeIsotipo(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ISOTIPO_VIEWBOX}" fill="none" stroke="${color}" stroke-width="${ISOTIPO_GROSOR}" stroke-linecap="round" stroke-linejoin="round"><path d="${ISOTIPO_TOLDO}"/><path d="${ISOTIPO_MOSTRADOR}"/></svg>`;
}
