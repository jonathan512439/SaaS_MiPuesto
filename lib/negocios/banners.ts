/* Los dos banners del catálogo: dos franjas anchas, las dos opcionales.
 *
 * Sirven para una promoción, un aviso —«cerrado el 6 de agosto»— o publicidad
 * propia, con la imagen y, encima, antetítulo, título, bajada y botón.
 *
 * **Van en `jsonb` y no en una tabla**, siguiendo a `redes_sociales`, que es la
 * misma clase de cosa: un dato corto, acotado, propio del negocio, que se lee
 * siempre junto con él y nunca se consulta por su cuenta. Una tabla sumaría una
 * política de RLS, una ida más a la base en el camino público y un `join` en la
 * consulta que más importa, a cambio de nada.
 *
 * **Son dos y no una lista libre.** Tres franjas de publicidad en un catálogo
 * de barrio es un catálogo que no se lee.
 *
 * La posición es la del arreglo: el primero va entre el horario y los productos,
 * y el segundo antes del pie. Sin campo `posicion`, que sería un dato más que
 * puede quedar en dos estados contradictorios.
 *
 * **Cuántos se ven lo decide el dueño, no el armazón**: un banner existe si
 * tiene imagen y texto alternativo, y se apaga borrándolo. El catálogo dibuja
 * los que haya y ninguno deja hueco si no está.
 *
 * `imagen` es una ruta dentro del depósito de negocios, no una dirección: ver el
 * comentario de `imagenValida`.
 */

export const MAXIMO_BANNERS = 2;

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
/* El texto que el diseño de referencia pone sobre el banner: un antetítulo
   corto, un título, una bajada y el rótulo del botón. Todos opcionales —un
   banner que es solo imagen sigue siendo válido, y es lo que hoy tienen los
   negocios cargados— y con techo, porque una franja no es un párrafo. */
const LARGO_MAXIMO_EYEBROW = 40;
const LARGO_MAXIMO_TITULO = 80;
const LARGO_MAXIMO_COPY = 160;
const LARGO_MAXIMO_BOTON = 32;

export type Banner = {
  imagen: string;
  /* Obligatorio y a propósito. Un banner sin texto alternativo es un hueco para
     quien navega con lector de pantalla, y en un catálogo donde el banner puede
     ser el aviso de que el negocio cierra por feriado, ese hueco es información
     perdida. */
  alt: string;
  /* El texto que se dibuja encima de la imagen, como en las maquetas de
     referencia. Nulo cuando el negocio no lo cargó: un banner sin texto es solo
     su imagen, y sigue siendo válido. */
  eyebrow: string | null;
  titulo: string | null;
  copy: string | null;
  boton: string | null;
  /* A dónde lleva al tocarlo. Opcional: un aviso no lleva a ninguna parte. */
  enlace: string | null;
};

function textoDe(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/* Un campo de texto opcional del banner: recortado al techo, o nulo si vacío. */
function textoOpcional(valor: unknown, largoMaximo: number): string | null {
  const texto = textoDe(valor).slice(0, largoMaximo);
  return texto === "" ? null : texto;
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

    banners.push({
      imagen,
      alt,
      eyebrow: textoOpcional(registro.eyebrow, LARGO_MAXIMO_EYEBROW),
      titulo: textoOpcional(registro.titulo, LARGO_MAXIMO_TITULO),
      copy: textoOpcional(registro.copy, LARGO_MAXIMO_COPY),
      boton: textoOpcional(registro.boton, LARGO_MAXIMO_BOTON),
      enlace: enlaceValido(registro.enlace),
    });
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
      banners.push({
        imagen,
        alt,
        eyebrow: textoOpcional(registro.eyebrow, LARGO_MAXIMO_EYEBROW),
        titulo: textoOpcional(registro.titulo, LARGO_MAXIMO_TITULO),
        copy: textoOpcional(registro.copy, LARGO_MAXIMO_COPY),
        boton: textoOpcional(registro.boton, LARGO_MAXIMO_BOTON),
        enlace,
      });
    }
  });

  return Object.keys(errores).length > 0 ? { correcto: false, errores } : { correcto: true, banners };
}
