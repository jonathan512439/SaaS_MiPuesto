import { PESO_MAXIMO_ORIGINAL } from "./imagenes";
import { PROPORCION_BANNER } from "./negocios/banners";

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
 * por los costados en el celular. Y, pedido el mismo día, la forma con su
 * número («16:7», «1:1») y el tamaño ideal y el mínimo, como instructivo: el
 * número es lo que se escribe en un editor de imágenes. Ese mismo día la
 * portada pasó a medir 16:7 en todas las pantallas: el dueño la subió tal como
 * decía la ayuda y la vio cortada igual, porque la caja cambiaba de forma.
 */

/* Cómo muestra el catálogo cada imagen: ancho dividido alto de su caja. Todas
   se recortan al centro para llenarla (`object-fit: cover`), salvo el QR de
   cobro y la ficha del producto, que se ven enteros. */
export const FORMAS_DE_IMAGEN = {
  portada: 16 / 7,
  tarjeta: { cuadricula: 4 / 3, fila: 1 / 1, vitrina: 3 / 4 },
} as const;

const MEGAS_MAXIMOS = Math.round(PESO_MAXIMO_ORIGINAL / (1024 * 1024));

type Medidas = {
  forma: readonly [number, number];
  /* Cómo se lee la forma: acostada, cuadrada o parada. */
  nombre: string;
  ideal: readonly [number, number];
  /* Lo más chico que se sigue viendo nítido donde se muestra más grande. */
  minimo: readonly [number, number];
};

/* Qué subir de cada imagen. Más grande que el ideal no molesta: la subida la
   achica sola, sin cortarla, a `LADO_MAXIMO_IMAGEN` por lado. Más chica que el
   mínimo se ve borrosa. La portada y el banner se piden con la forma exacta de
   su caja: la de la portada es `FORMAS_DE_IMAGEN.portada` y la del banner vive
   en `PROPORCION_BANNER`. */
export const MEDIDAS_DE_IMAGEN = {
  portada: { forma: [16, 7], nombre: "acostada", ideal: [1600, 700], minimo: [1200, 525] },
  logo: { forma: [1, 1], nombre: "cuadrada", ideal: [500, 500], minimo: [200, 200] },
  banner: {
    forma: [PROPORCION_BANNER.ancho, PROPORCION_BANNER.alto],
    nombre: "acostada",
    ideal: [1200, 600],
    minimo: [800, 400],
  },
  producto: { forma: [1, 1], nombre: "cuadrada", ideal: [1200, 1200], minimo: [600, 600] },
  qr: { forma: [1, 1], nombre: "cuadrada", ideal: [800, 800], minimo: [300, 300] },
} as const satisfies Record<string, Medidas>;

const tamano = ([ancho, alto]: readonly [number, number]) => `${ancho} × ${alto}`;

/* El instructivo, igual en todas: la forma con su número, el tamaño ideal y el
   mínimo. */
export function instructivoDeImagen(medidas: Medidas) {
  const [ancho, alto] = medidas.forma;
  return `Forma ${ancho}:${alto} (${medidas.nombre}). Ideal: ${tamano(medidas.ideal)}; lo más chico que se ve nítido: ${tamano(medidas.minimo)}. Más grande no importa: la achicamos sola, sin cortarla.`;
}

const { portada, logo, banner, producto, qr } = MEDIDAS_DE_IMAGEN;
const { cuadricula, fila, vitrina } = FORMAS_DE_IMAGEN.tarjeta;
const comoForma = (valor: number) => (valor === 4 / 3 ? "4:3" : valor === 3 / 4 ? "3:4" : valor === 1 ? "1:1" : String(valor));

export const AYUDA_PORTADA = `${instructivoDeImagen(portada)} Con esa forma se ve entera, en el celular y en la computadora. Si es más ancha, se cortan los costados; si es más alta, arriba y abajo. Si quieres un texto, escríbelo en «Texto sobre tu portada», no en la imagen: ese se lee siempre. En la computadora va encima de la foto, a la izquierda; en el celular, debajo, para que la foto no se corte.`;

export const AYUDA_LOGO = `Cuadrada. ${instructivoDeImagen(logo)} Si no es cuadrada, se corta al centro. Se muestra chica, del tamaño de una moneda: si tiene letras finas no se van a leer.`;

export const AYUDA_QR = `Cuadrada. ${instructivoDeImagen(qr)} Que el código ocupe casi toda la imagen, derecho y sin marco: se muestra entera. Sácale la foto apoyado en una mesa, no en la mano.`;

export const AYUDA_BANNER = `${instructivoDeImagen(banner)} Con esa forma se ve entera, en el celular y en la computadora. Si es más ancha, se cortan los costados; si es más alta, arriba y abajo. Y si le escribes un texto largo encima, en el celular la franja crece un poco hacia abajo: deja aire en los bordes.`;

/* La tarjeta cambia de forma según lo que el dueño eligió en Apariencia, así
   que ninguna foto entra entera en las tres: la cuadrada es la que menos
   pierde, un octavo por lado en la más acostada y en la más parada. */
export const AYUDA_FOTO_PRODUCTO = `Un producto por foto, de cerca y con buena luz. ${instructivoDeImagen(producto)} Con el producto al centro y un poco de aire alrededor: en la ficha del producto se ve entera, y en las tarjetas se recorta al centro según la forma que elegiste en Apariencia (${comoForma(cuadricula)} en Cuadrícula, ${comoForma(fila)} en Una por fila, ${comoForma(vitrina)} en Vitrina). Puede ser la foto tal cual sale del celular, hasta ${MEGAS_MAXIMOS} MB.`;

/* La ayuda de la categoría, el nombre y la descripción del producto dependen
   del rubro del negocio y viven en `catalogo/guias-por-rubro.ts`. */

export const AYUDA_SUBCATEGORIA =
  "Solo si una categoría se hizo muy larga. Por ejemplo, dentro de «Bebidas»: «Calientes» y «Frías».";

/* Desde la fase 13 cada talla, número o tamaño puede tener su propio precio,
   y eso se carga en el producto ya creado, no duplicándolo. */
export const AYUDA_PRECIO =
  "Solo el número, en bolivianos. Si el precio cambia por talla o tamaño, después de crear el producto le agregas esas opciones, cada una con su precio.";
