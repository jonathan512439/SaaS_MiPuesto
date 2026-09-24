/* El banner de publicidad del catálogo: una franja ancha entre dos categorías.
 *
 * Sirve para una promoción, un aviso —«cerrado el 6 de agosto»— o publicidad
 * propia, con la imagen y, encima, antetítulo, título, bajada y botón.
 *
 * **Era dos.** Había uno arriba, entre el horario y los productos, y este a la
 * mitad. El de arriba iba a cien píxeles de la portada —otra franja ancha con
 * texto encima— y el dueño pidió sacarlo y pasar lo que se podía escribir sobre
 * él a la portada, que ya estaba ahí y ya era el primer cartel. Lo que se
 * escribe sobre la portada vive en `portada_texto` (`texto-sobre-imagen.ts`);
 * acá queda el de la mitad, solo.
 *
 * **Va en `jsonb` y no en una tabla**, siguiendo a `redes_sociales`, que es la
 * misma clase de cosa: un dato corto, acotado, propio del negocio, que se lee
 * siempre junto con él y nunca se consulta por su cuenta. Una tabla sumaría una
 * política de RLS, una ida más a la base en el camino público y un `join` en la
 * consulta que más importa, a cambio de nada.
 *
 * **Sigue siendo una lista** aunque tenga un solo lugar: la columna ya era una
 * lista, los negocios cargados ya la tienen así, y la migración que sacó el de
 * arriba corrió el de la mitad al primer lugar. Cambiar la forma de la columna
 * por un banner que se sacó sería tocar más de lo que se pidió.
 *
 * **Cuántos se ven lo decide el dueño, no el armazón**: un banner existe si
 * tiene imagen y texto alternativo, y se apaga borrándolo. El catálogo dibuja
 * el que haya y no deja hueco si no está.
 *
 * `imagen` es una ruta dentro del depósito de negocios, no una dirección: ver el
 * comentario de `imagenValida`.
 */

import {
  enlaceValido,
  leerTextoSobreImagen,
  textoDe,
  type TextoSobreImagen,
} from "./texto-sobre-imagen";

export const MAXIMO_BANNERS = 1;

/* La forma de la imagen del banner, en un solo lugar.
 *
 * El dueño tiene que **poder prepararla antes de subirla**: sin saber la
 * proporción, arma una imagen cuadrada, el catálogo la recorta por el medio y
 * pierde justo lo que quería mostrar. Decir «ancha» no alcanza; hace falta el
 * número.
 *
 * Vive acá y no suelto en el texto del formulario porque **la hoja de estilos
 * declara el mismo número**, y dos copias se separan. Una prueba las compara. */
export const PROPORCION_BANNER = {
  ancho: 2,
  alto: 1,
  /* Un tamaño concreto, no solo la razón: quien abre un editor de imágenes
     escribe píxeles, no proporciones. */
  ejemplo: "1200 × 600 píxeles",
} as const;
const LARGO_MAXIMO_ALT = 120;
export type Banner = TextoSobreImagen & {
  imagen: string;
  /* Obligatorio y a propósito. Un banner sin texto alternativo es un hueco para
     quien navega con lector de pantalla, y en un catálogo donde el banner puede
     ser el aviso de que el negocio cierra por feriado, ese hueco es información
     perdida. */
  alt: string;
};

/* La imagen es una **ruta dentro del depósito**, no una dirección completa.
 *
 * Guardar la URL entera hornea el proyecto de Supabase adentro del dato: una
 * base restaurada en otro proyecto seguiría apuntando a las imágenes del
 * anterior, que además puede no existir. Es la misma forma que ya usan el logo,
 * la portada y el QR, y la dirección la arma `obtenerUrlPublicaImagenNegocio` al
 * momento de servirla.
 *
 * Se descarta lo que podría salirse del depósito. Que la ruta sea de este
 * negocio lo comprueba el servidor al guardarla, que es donde se sabe cuál es. */
function imagenValida(valor: unknown): string | null {
  const texto = textoDe(valor);
  if (texto === "" || texto.length > 300) return null;
  if (texto.includes("..") || texto.includes("\\") || texto.startsWith("/")) return null;
  return texto;
}

/* Lee lo que haya en la columna sin confiar en nada.
 *
 * Se descarta lo que no sirve en vez de fallar: la columna se llena desde el
 * panel, pero también podría venir de una restauración o de un script, y un
 * banner mal formado no tiene por qué dejar el catálogo entero sin cargar. Lo
 * que no se puede dibujar, no se dibuja. */
export function leerBanners(valor: unknown): Array<Banner | null> {
  const guardados = Array.isArray(valor) ? valor : [];

  /* Siempre la misma cantidad de lugares, aunque no haya nada en ninguno: quien
     lo lee pregunta por el lugar que le toca dibujar, no por cuántos hay. */
  return Array.from({ length: MAXIMO_BANNERS }, (_, indice) => {
    const crudo = guardados[indice];
    if (typeof crudo !== "object" || crudo === null) return null;

    const registro = crudo as Record<string, unknown>;
    const imagen = imagenValida(registro.imagen);
    const alt = textoDe(registro.alt).slice(0, LARGO_MAXIMO_ALT);
    /* Sin imagen no hay banner, y sin texto alternativo tampoco: dibujar uno
       mudo sería peor que no dibujarlo. El lugar queda vacío, no se corre. */
    if (!imagen || alt === "") return null;

    return { imagen, alt, ...leerTextoSobreImagen(registro) };
  });
}

/* Valida lo que manda el panel antes de guardarlo, y dice qué está mal.
 *
 * Distinto de `leerBanners`, que descarta en silencio: acá hay una persona
 * esperando saber por qué no se guardó lo que cargó. */
export type ResultadoBanners =
  | { correcto: true; banners: Array<Banner | null> }
  | { correcto: false; errores: Record<string, string> };

export function validarBanners(valor: unknown): ResultadoBanners {
  if (valor === undefined || valor === null) return { correcto: true, banners: [] };
  if (!Array.isArray(valor)) {
    return { correcto: false, errores: { banners: "Los banners tienen que venir en una lista." } };
  }
  if (valor.length > MAXIMO_BANNERS) {
    return {
      correcto: false,
      errores: {
        banners:
          MAXIMO_BANNERS === 1
            ? "Se puede publicar un solo banner."
            : `Se pueden publicar hasta ${MAXIMO_BANNERS} banners.`,
      },
    };
  }

  const errores: Record<string, string> = {};
  const banners: Array<Banner | null> = [];

  valor.forEach((crudo, indice) => {
    /* `null` es «este lugar queda vacío», y es una respuesta válida. */
    if (crudo === null || crudo === undefined) {
      banners.push(null);
      return;
    }

    const registro =
      typeof crudo === "object" ? (crudo as Record<string, unknown>) : {};
    const imagen = imagenValida(registro.imagen);
    const alt = textoDe(registro.alt);
    const enlaceCrudo = textoDe(registro.enlace);
    const enlace = enlaceValido(registro.enlace);

    if (!imagen) errores[`banners.${indice}.imagen`] = "Sube una imagen para el banner.";
    if (alt === "") {
      errores[`banners.${indice}.alt`] = "Escribe qué dice el banner, para quien no puede verlo.";
    } else if (alt.length > LARGO_MAXIMO_ALT) {
      errores[`banners.${indice}.alt`] = `Usa hasta ${LARGO_MAXIMO_ALT} caracteres.`;
    }
    if (enlaceCrudo !== "" && !enlace) {
      errores[`banners.${indice}.enlace`] = "El enlace tiene que empezar con https://";
    }

    if (imagen && alt !== "" && alt.length <= LARGO_MAXIMO_ALT) {
      banners.push({ imagen, alt, ...leerTextoSobreImagen(registro) });
    } else {
      /* Quedó con errores: se ocupa el lugar igual. La respuesta no se usa —hay
         errores— pero el arreglo se mantiene legible para quien lo lea. */
      banners.push(null);
    }
  });

  return Object.keys(errores).length > 0 ? { correcto: false, errores } : { correcto: true, banners };
}
