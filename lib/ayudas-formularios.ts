import { PESO_MAXIMO_ORIGINAL } from "./imagenes";

/* Las ayudas de los formularios, escritas en un solo lugar.
 *
 * Están sacadas de lo que el sistema hace de verdad, no de recomendaciones
 * generales: las formas son las que usa la plantilla del catálogo
 * (`FORMAS_DE_IMAGEN`, que una prueba compara con su CSS), y el peso máximo
 * sale de la misma constante que valida la subida. Una ayuda que dice un número
 * distinto del que el código aplica es peor que no tener ayuda.
 *
 * Están escritas para alguien que vende en un mercado. Desde el 2026-10-13 no
 * dicen «16:9», «píxeles» ni «MB» de adorno —pedido del dueño: «menos
 * técnico»—: la forma va con palabras y un ejemplo en números («1600 de ancho
 * por 700 de alto»). Desde el 2026-10-21 dicen además **qué se corta y dónde**
 * en cada pantalla —pedido del dueño: «para que se suba una imagen lo más
 * certera posible»—: una portada armada sin saberlo salía con el texto cortado
 * por los costados en el celular.
 */

/* Cómo muestra el catálogo cada imagen: ancho dividido alto de su caja. Todas
   se recortan al centro para llenarla (`object-fit: cover`), salvo el QR de
   cobro y la ficha del producto, que se ven enteros. */
export const FORMAS_DE_IMAGEN = {
  portada: { telefono: 16 / 9, tableta: 21 / 9, computadora: 3 / 1 },
  tarjeta: { cuadricula: 4 / 3, fila: 1 / 1, vitrina: 3 / 4 },
} as const;

const MEGAS_MAXIMOS = Math.round(PESO_MAXIMO_ORIGINAL / (1024 * 1024));

/* El ejemplo está a mitad de camino entre la forma del celular y la de la
   computadora: así las dos recortan lo mismo, un octavo por lado. */
export const AYUDA_PORTADA =
  "Una foto acostada, de unos 1600 de ancho por 700 de alto. No se ve igual en todas las pantallas: en el celular se cortan los costados y en la computadora, arriba y abajo. Pon lo importante al centro y deja libre un octavo en cada borde. Si quieres un texto encima, escríbelo en «Texto sobre tu portada»: ese no se corta nunca.";

export const AYUDA_LOGO =
  "Cuadrada, por ejemplo de 500 de ancho por 500 de alto: si no lo es, se corta al centro. Se muestra chica, del tamaño de una moneda: si tiene letras finas no se van a leer.";

export const AYUDA_QR =
  "Cuadrada, con el código ocupando casi toda la imagen, derecho y sin marco: se muestra entera dentro de un cuadrado. Sácale la foto apoyado en una mesa, no en la mano.";

/* La tarjeta cambia de forma según lo que el dueño eligió en Apariencia, así
   que ninguna foto entra entera en las tres: la cuadrada es la que menos
   pierde, un octavo por lado en la más acostada y en la más parada. */
export const AYUDA_FOTO_PRODUCTO = `Un producto por foto, de cerca y con buena luz. Lo más seguro es una foto cuadrada, de unos 1200 de ancho por 1200 de alto, con el producto al centro y un poco de aire alrededor: en la ficha del producto se ve entera, y en las tarjetas se recorta al centro según la forma que elegiste en Apariencia (acostada en Cuadrícula, cuadrada en Una por fila, parada en Vitrina). Puede ser la foto tal cual sale del celular, hasta ${MEGAS_MAXIMOS} MB: la achicamos sola.`;

/* La ayuda de la categoría, el nombre y la descripción del producto dependen
   del rubro del negocio y viven en `catalogo/guias-por-rubro.ts`. */

export const AYUDA_SUBCATEGORIA =
  "Solo si una categoría se hizo muy larga. Por ejemplo, dentro de «Bebidas»: «Calientes» y «Frías».";

/* Desde la fase 13 cada talla, número o tamaño puede tener su propio precio,
   y eso se carga en el producto ya creado, no duplicándolo. */
export const AYUDA_PRECIO =
  "Solo el número, en bolivianos. Si el precio cambia por talla o tamaño, después de crear el producto le agregas esas opciones, cada una con su precio.";
