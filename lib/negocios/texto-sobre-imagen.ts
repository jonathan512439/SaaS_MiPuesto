/* Lo que se escribe encima de una imagen ancha del catálogo.
 *
 * Son dos lugares con la misma forma: la **portada** —la foto grande debajo de
 * la cabecera— y el **banner de publicidad** que va entre dos categorías. En los
 * dos, el dueño puede poner un antetítulo, un título, una bajada y un botón que
 * lleva a alguna parte; y en los dos, puede no poner nada y dejar la imagen
 * sola.
 *
 * Nació cuando el banner de arriba dejó de existir. Había tres franjas anchas
 * en el catálogo —portada, banner de arriba y publicidad— y las dos primeras
 * iban pegadas: el dueño pidió sacar la del medio y que lo que se podía escribir
 * sobre ella se pudiera escribir **sobre la portada**, que ya está ahí y ya se
 * ve primero. Con eso la portada pasó a ser el primer cartel del negocio, y su
 * texto y el del banner son la misma cosa. Un solo tipo, un solo lector.
 *
 * **Todo opcional y con techo**: una franja no es un párrafo. Los techos son los
 * que tenía el banner desde el principio.
 */

export const LARGO_MAXIMO_EYEBROW = 40;
export const LARGO_MAXIMO_TITULO = 80;
export const LARGO_MAXIMO_COPY = 160;
export const LARGO_MAXIMO_BOTON = 32;

export type TextoSobreImagen = {
  eyebrow: string | null;
  titulo: string | null;
  copy: string | null;
  /* El rótulo del botón. Se dibuja solo si además hay a dónde llevar: un botón
     que no hace nada es peor que ninguno. */
  boton: string | null;
  /* A dónde lleva al tocarlo. Opcional: un aviso no lleva a ninguna parte. */
  enlace: string | null;
};

export const SIN_TEXTO: TextoSobreImagen = {
  eyebrow: null,
  titulo: null,
  copy: null,
  boton: null,
  enlace: null,
};

export function textoDe(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/* Un campo de texto opcional: recortado al techo, o nulo si vacío. */
export function textoOpcional(valor: unknown, largoMaximo: number): string | null {
  const texto = textoDe(valor).slice(0, largoMaximo);
  return texto === "" ? null : texto;
}

/* Solo `https`. Una portada o un banner es lo más grande y lo más tentador de
   tocar en la pantalla, y un enlace que sale del catálogo del negocio hacia una
   dirección sin cifrar es exactamente el recorrido que no se quiere ofrecer. */
export function enlaceValido(valor: unknown): string | null {
  const texto = textoDe(valor);
  if (texto === "") return null;
  try {
    return new URL(texto).protocol === "https:" ? texto : null;
  } catch {
    return null;
  }
}

/* Lee los cinco campos de un registro cualquiera, sin confiar en nada: lo que
   no sirve queda en nulo, no rompe. */
export function leerTextoSobreImagen(registro: Record<string, unknown>): TextoSobreImagen {
  return {
    eyebrow: textoOpcional(registro.eyebrow, LARGO_MAXIMO_EYEBROW),
    titulo: textoOpcional(registro.titulo, LARGO_MAXIMO_TITULO),
    copy: textoOpcional(registro.copy, LARGO_MAXIMO_COPY),
    boton: textoOpcional(registro.boton, LARGO_MAXIMO_BOTON),
    enlace: enlaceValido(registro.enlace),
  };
}

/* Si hay algo que dibujar encima de la imagen.
 *
 * Es la pregunta de la que depende la cortina: el sombreado en degradé existe
 * para que la letra se lea sobre la foto, y **sin letra no hay cortina**. Antes
 * la portada llevaba la cortina siempre, y una foto de ambiente que el negocio
 * eligió con cuidado se veía velada de un lado sin que nada lo justificara.
 *
 * El botón cuenta solo si tiene a dónde llevar, que es la misma regla con la
 * que se dibuja. */
export function tieneAlgoEncima(texto: TextoSobreImagen): boolean {
  return Boolean(texto.eyebrow || texto.titulo || texto.copy || (texto.boton && texto.enlace));
}

/* El texto de la portada, tal como está en la columna `portada_texto`.
 *
 * Distinto del banner, acá **no hay imagen ni texto alternativo que exigir**: la
 * imagen es la portada, que vive en su propia columna y tiene su propio `alt`.
 * Por eso no devuelve nulo nunca: sin nada cargado es «sin texto», que es un
 * valor y no una ausencia, y quien dibuja pregunta `tieneAlgoEncima`. */
export function leerTextoPortada(valor: unknown): TextoSobreImagen {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return SIN_TEXTO;
  return leerTextoSobreImagen(valor as Record<string, unknown>);
}

/* Valida lo que manda el panel antes de guardarlo, y dice qué está mal.
 *
 * Distinto de `leerTextoPortada`, que descarta en silencio: acá hay una persona
 * esperando saber por qué no se guardó lo que cargó. Lo único que puede estar
 * mal es el enlace; los textos se recortan y listo. */
export type ResultadoTextoPortada =
  | { correcto: true; texto: TextoSobreImagen }
  | { correcto: false; errores: Record<string, string> };

export function validarTextoPortada(valor: unknown): ResultadoTextoPortada {
  if (valor === undefined || valor === null) return { correcto: true, texto: SIN_TEXTO };
  if (typeof valor !== "object" || Array.isArray(valor)) {
    return { correcto: false, errores: { portada: "El texto de la portada no tiene la forma esperada." } };
  }

  const registro = valor as Record<string, unknown>;
  const enlaceCrudo = textoDe(registro.enlace);
  const texto = leerTextoSobreImagen(registro);
  if (enlaceCrudo !== "" && !texto.enlace) {
    return { correcto: false, errores: { "portada.enlace": "El enlace tiene que empezar con https://" } };
  }
  return { correcto: true, texto };
}
