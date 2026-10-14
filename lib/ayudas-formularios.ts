import { PESO_MAXIMO_ORIGINAL } from "./imagenes";

/* Las ayudas de los formularios, escritas en un solo lugar.
 *
 * Están sacadas de lo que el sistema hace de verdad, no de recomendaciones
 * generales: la proporción de la portada es la que usan las plantillas
 * (`aspect-ratio: 16 / 7`), y el peso máximo sale de la misma constante que
 * valida la subida. Una ayuda que dice un número distinto del que el código
 * aplica es peor que no tener ayuda.
 *
 * Están escritas para alguien que vende en un mercado. Nada de «resolución
 * recomendada» ni de proporciones: qué foto sacar y qué va a pasar con ella.
 * Desde el 2026-10-13 tampoco «16:7», «píxeles» ni «MB» —pedido del dueño:
 * «menos técnico»—; la forma se dice con palabras y un ejemplo, y el ejemplo
 * sigue saliendo de lo que el código aplica.
 */
const MEGAS_MAXIMOS = Math.round(PESO_MAXIMO_ORIGINAL / (1024 * 1024));

export const AYUDA_PORTADA =
  "Una foto acostada, más del doble de ancha que de alta (por ejemplo, 1600 de ancho por 700 de alto). Se recorta arriba y abajo: pon lo importante al centro y no escribas nada pegado a los bordes.";

export const AYUDA_LOGO =
  "Cuadrada, y no hace falta que sea grande. Se muestra chica, del tamaño de una moneda: si tiene letras finas no se van a leer.";

export const AYUDA_QR =
  "Que el código ocupe casi toda la imagen, derecho y sin marco. Sácale la foto apoyado en una mesa, no en la mano.";

export const AYUDA_FOTO_PRODUCTO = `Un producto por foto, de cerca y con buena luz. En las tarjetas se muestra recortada al centro, así que pon el producto al medio. Puede ser la foto tal cual sale del celular, hasta ${MEGAS_MAXIMOS} MB: la achicamos sola.`;

/* La ayuda de la categoría, el nombre y la descripción del producto dependen
   del rubro del negocio y viven en `catalogo/guias-por-rubro.ts`. */

export const AYUDA_SUBCATEGORIA =
  "Solo si una categoría se hizo muy larga. Por ejemplo, dentro de «Bebidas»: «Calientes» y «Frías».";

/* Desde la fase 13 cada talla, número o tamaño puede tener su propio precio,
   y eso se carga en el producto ya creado, no duplicándolo. */
export const AYUDA_PRECIO =
  "Solo el número, en bolivianos. Si el precio cambia por talla o tamaño, después de crear el producto le agregas esas opciones, cada una con su precio.";
