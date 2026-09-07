import { LADO_MAXIMO_IMAGEN, PESO_MAXIMO_ORIGINAL } from "./imagenes";

/* Las ayudas de los formularios, escritas en un solo lugar.
 *
 * Están sacadas de lo que el sistema hace de verdad, no de recomendaciones
 * generales: la proporción de la portada es la que usan las plantillas
 * (`aspect-ratio: 16 / 7`), y el peso máximo sale de la misma constante que
 * valida la subida. Una ayuda que dice un número distinto del que el código
 * aplica es peor que no tener ayuda.
 *
 * Están escritas para alguien que vende en un mercado. Nada de «resolución
 * recomendada»: qué foto sacar y qué va a pasar con ella.
 */
const MEGAS_MAXIMOS = Math.round(PESO_MAXIMO_ORIGINAL / (1024 * 1024));

export const AYUDA_PORTADA =
  "Horizontal y ancha, tipo 16:7 —por ejemplo 1600 × 700—. Se recorta arriba y abajo, así que lo importante va al centro: no pongas texto pegado a los bordes.";

export const AYUDA_LOGO =
  "Cuadrada, con 400 × 400 alcanza. Se muestra chica, del tamaño de una moneda: si tiene letras finas no se van a leer.";

export const AYUDA_QR =
  "Que el código ocupe casi toda la imagen, derecho y sin marco. Sacale la foto apoyado en una mesa, no en la mano.";

export const AYUDA_FOTO_PRODUCTO = `Un producto por foto, de cerca y con buena luz. Se recorta cuadrada, así que centralo. Hasta ${MEGAS_MAXIMOS} MB; la achicamos sola a ${LADO_MAXIMO_IMAGEN} píxeles.`;

/* Las categorías son la decisión que más cuesta y la que más ordena el
   catálogo. La ayuda da el criterio, no la definición. */
export const AYUDA_CATEGORIA =
  "Agrupá como los busca tu cliente, no como los guardás vos: «Almuerzos», «Bebidas», «Postres». Entre cuatro y ocho alcanzan; con veinte, el catálogo se vuelve una lista larga otra vez.";

export const AYUDA_SUBCATEGORIA =
  "Solo si una categoría se hizo muy larga. Por ejemplo, dentro de «Bebidas»: «Calientes» y «Frías».";

export const AYUDA_NOMBRE_PRODUCTO =
  "Como lo pide tu cliente, no como figura en tu factura. «Silpancho» antes que «Plato ejecutivo N.° 3».";

export const AYUDA_DESCRIPCION_PRODUCTO =
  "Lo que no se ve en la foto: qué trae, de qué tamaño, para cuántas personas. Dos renglones bastan.";

export const AYUDA_PRECIO =
  "Solo el número, en bolivianos. Si cambia por tamaño, cargá un producto por tamaño.";
