/* Los dos banners del catálogo.
 *
 * Aparecen en casi todas las maquetas de `Catalogos_Ejemplo/`: una franja ancha
 * arriba, debajo de la portada, y otra abajo, antes del pie. Sirven para una
 * promoción, un aviso —«cerrado el 6 de agosto»— o publicidad propia.
 *
 * **Van en `jsonb` y no en una tabla**, siguiendo a `redes_sociales`, que es la
 * misma clase de cosa: una lista corta, acotada, propia del negocio, que se lee
 * siempre junto con él y nunca se consulta por su cuenta. Una tabla sumaría una
 * política de RLS, una ida más a la base en el camino público y un `join` en la
 * consulta que más importa, a cambio de nada.
 *
 * **Son dos y no una lista libre.** Tres franjas de publicidad en un catálogo de
 * barrio es un catálogo que no se lee. El techo está en la restricción de la
 * base, no solo acá.
 *
 * La posición es la del arreglo: el primero va arriba y el segundo abajo. Sin
 * campo `posicion`, que sería un dato más que puede quedar en dos estados
 * contradictorios.
 */

export const MAXIMO_BANNERS = 2;
const LARGO_MAXIMO_ALT = 120;

export type Banner = {
  imagen: string;
  /* Obligatorio y a propósito. Un banner sin texto alternativo es un hueco para
     quien navega con lector de pantalla, y en un catálogo donde el banner puede
     ser el aviso de que el negocio cierra por feriado, ese hueco es información
     perdida. */
  alt: string;
  /* A dónde lleva al tocarlo. Opcional: un aviso no lleva a ninguna parte. */
  enlace: string | null;
};

function textoDe(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/* Solo `https`. Un banner es lo más grande y lo más tentador de tocar en la
   pantalla, y un enlace que sale del catálogo del negocio hacia una dirección
   sin cifrar es exactamente el recorrido que no se quiere ofrecer. */
function enlaceValido(valor: unknown): string | null {
  const texto = textoDe(valor);
  if (texto === "") return null;
  try {
    return new URL(texto).protocol === "https:" ? texto : null;
  } catch {
    return null;
  }
}

function imagenValida(valor: unknown): string | null {
  const texto = textoDe(valor);
  if (texto === "") return null;
  try {
    return new URL(texto).protocol === "https:" ? texto : null;
  } catch {
    return null;
  }
}

/* Lee lo que haya en la columna sin confiar en nada.
 *
 * Se descarta lo que no sirve en vez de fallar: la columna se llena desde el
 * panel, pero también podría venir de una restauración o de un script, y un
 * banner mal formado no tiene por qué dejar el catálogo entero sin cargar. Lo
 * que no se puede dibujar, no se dibuja. */
export function leerBanners(valor: unknown): Banner[] {
  if (!Array.isArray(valor)) return [];

  const banners: Banner[] = [];
  for (const crudo of valor) {
    if (banners.length >= MAXIMO_BANNERS) break;
    if (typeof crudo !== "object" || crudo === null) continue;

    const registro = crudo as Record<string, unknown>;
    const imagen = imagenValida(registro.imagen);
    const alt = textoDe(registro.alt).slice(0, LARGO_MAXIMO_ALT);
    /* Sin imagen no hay banner, y sin texto alternativo tampoco: dibujar uno
       mudo sería peor que no dibujarlo. */
    if (!imagen || alt === "") continue;

    banners.push({ imagen, alt, enlace: enlaceValido(registro.enlace) });
  }
  return banners;
}

/* Valida lo que manda el panel antes de guardarlo, y dice qué está mal.
 *
 * Distinto de `leerBanners`, que descarta en silencio: acá hay una persona
 * esperando saber por qué no se guardó lo que cargó. */
export type ResultadoBanners =
  | { correcto: true; banners: Banner[] }
  | { correcto: false; errores: Record<string, string> };

export function validarBanners(valor: unknown): ResultadoBanners {
  if (valor === undefined || valor === null) return { correcto: true, banners: [] };
  if (!Array.isArray(valor)) {
    return { correcto: false, errores: { banners: "Los banners tienen que venir en una lista." } };
  }
  if (valor.length > MAXIMO_BANNERS) {
    return {
      correcto: false,
      errores: { banners: `Se pueden publicar hasta ${MAXIMO_BANNERS} banners.` },
    };
  }

  const errores: Record<string, string> = {};
  const banners: Banner[] = [];

  valor.forEach((crudo, indice) => {
    const registro =
      typeof crudo === "object" && crudo !== null ? (crudo as Record<string, unknown>) : {};
    const imagen = imagenValida(registro.imagen);
    const alt = textoDe(registro.alt);
    const enlaceCrudo = textoDe(registro.enlace);
    const enlace = enlaceValido(registro.enlace);

    if (!imagen) errores[`banners.${indice}.imagen`] = "Subí una imagen para el banner.";
    if (alt === "") {
      errores[`banners.${indice}.alt`] = "Escribí qué dice el banner, para quien no puede verlo.";
    } else if (alt.length > LARGO_MAXIMO_ALT) {
      errores[`banners.${indice}.alt`] = `Usá hasta ${LARGO_MAXIMO_ALT} caracteres.`;
    }
    if (enlaceCrudo !== "" && !enlace) {
      errores[`banners.${indice}.enlace`] = "El enlace tiene que empezar con https://";
    }

    if (imagen && alt !== "" && alt.length <= LARGO_MAXIMO_ALT) {
      banners.push({ imagen, alt, enlace });
    }
  });

  return Object.keys(errores).length > 0 ? { correcto: false, errores } : { correcto: true, banners };
}
