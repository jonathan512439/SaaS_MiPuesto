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

/* La ayuda de la categoría, el nombre y la descripción del producto dependen
   del rubro del negocio y viven en `catalogo/guias-por-rubro.ts`. */

export const AYUDA_SUBCATEGORIA =
  "Solo si una categoría se hizo muy larga. Por ejemplo, dentro de «Bebidas»: «Calientes» y «Frías».";

/* Desde la fase 13 cada talla, número o tamaño puede tener su propio precio,
   y eso se carga en el producto ya creado, no duplicándolo. */
export const AYUDA_PRECIO =
  "Solo el número, en bolivianos. Si cambia por talla o tamaño, después de crear el producto le agregas sus presentaciones, cada una con su precio.";
