/* El texto de un PDF grande, listo para mandar a leer.
 *
 * Un catálogo con fotos pesa decenas de megas por las fotos, y las fotos no le
 * sirven a la lectura: el nombre y el precio están escritos como texto. Por eso
 * un PDF de más de 4 MB no se sube: se abre en el navegador
 * (`lib/ia/pdf-grande.ts`) y viaja solo su texto, unas decenas de kilobytes. Es
 * lo que evita subir 30 MB con datos móviles y lo que el Worker puede atender.
 *
 * Esta parte no sabe de pdf.js: recibe los trozos de texto con su posición, y
 * por eso se prueba sin navegador. */

export type TrozoDeTexto = { texto: string; x: number; y: number; ancho: number; alto: number };

/* Una página con menos que esto no trae texto de verdad: es una imagen, o solo
   el número de página. Se lee como imagen o no se lee. */
const CARACTERES_MINIMOS_POR_PAGINA = 12;

/* Lo que se le manda al modelo de una vez. Medido el 2026-11-05 con 127 productos
   en 4,3 KB de texto: 14 segundos sin descripciones, el doble de escritura con
   ellas: 60 productos con descripción tardaron unos 20. A 2 KB son unos 50 por
   tanda, con margen frente a los 30 segundos de `lib/ia/gemini.ts`. */
export const CARACTERES_POR_TANDA = 2_000;

/* Treinta tandas son unos mil productos. Cada una es una llamada al modelo
   y hay 500 por día para todos los negocios: una lectura no puede gastar más. */
export const TANDAS_MAXIMAS = 30;
export const CARACTERES_MAXIMOS = CARACTERES_POR_TANDA * TANDAS_MAXIMAS;
export const PAGINAS_MAXIMAS = 400;

const mediana = (valores: number[]) => [...valores].sort((a, b) => a - b)[Math.floor(valores.length / 2)];

/* Los renglones de una página, en el orden en que se ven.
 *
 * pdf.js entrega el texto en el orden en que está guardado, que no tiene por
 * qué ser el de lectura: en un catálogo a tres columnas, el orden real solo se
 * sabe por la posición. Se agrupa por altura para armar cada renglón y, dentro
 * de él, se ordena de izquierda a derecha.
 *
 * Un salto grande entre dos trozos es un cambio de columna y se marca con `|`.
 * Sin esa marca, «Mochila Bs 80» y «Cartera Bs 60» de una misma fila se leerían
 * como un solo renglón, y un precio podría caer en el producto de al lado. */
export function renglonesDePagina(trozos: readonly TrozoDeTexto[]): string[] {
  const conTexto = trozos.filter(({ texto }) => texto.trim() !== "");
  if (conTexto.length === 0) return [];

  const alto = mediana(conTexto.map((trozo) => trozo.alto)) || 10;
  const tolerancia = alto * 0.5;
  const filas: TrozoDeTexto[][] = [];
  /* De arriba hacia abajo: en un PDF, `y` crece hacia arriba. */
  for (const trozo of [...conTexto].sort((a, b) => b.y - a.y)) {
    const fila = filas.at(-1);
    if (fila && Math.abs(fila[0].y - trozo.y) <= tolerancia) fila.push(trozo);
    else filas.push([trozo]);
  }

  return filas.map((fila) => {
    let renglon = "";
    let finAnterior: number | null = null;
    for (const trozo of [...fila].sort((a, b) => a.x - b.x)) {
      if (finAnterior !== null) {
        const salto = trozo.x - finAnterior;
        if (salto > alto * 2) renglon += " | ";
        else if (salto > alto * 0.15 && !renglon.endsWith(" ")) renglon += " ";
      }
      renglon += trozo.texto;
      finAnterior = trozo.x + trozo.ancho;
    }
    return renglon.replace(/\s+/g, " ").trim();
  });
}

export function paginaTieneTexto(renglones: readonly string[]): boolean {
  return renglones.join("").replace(/\s/g, "").length >= CARACTERES_MINIMOS_POR_PAGINA;
}

/* Las páginas agrupadas en tandas, sin cortar una página al medio salvo que ella
   sola no entre. Cortar un renglón separaría un nombre de su precio. */
export function dividirEnTandas(paginas: readonly { numero: number; texto: string }[]): string[] {
  const tandas: string[] = [];
  let actual = "";
  const cerrar = () => {
    if (actual) tandas.push(actual);
    actual = "";
  };

  for (const { numero, texto } of paginas) {
    const bloque = `--- Página ${numero} ---\n${texto}`;
    if (bloque.length <= CARACTERES_POR_TANDA) {
      if (actual.length + bloque.length + 1 > CARACTERES_POR_TANDA) cerrar();
      actual = actual ? `${actual}\n${bloque}` : bloque;
      continue;
    }
    cerrar();
    for (const renglon of bloque.split("\n")) {
      if (actual.length + renglon.length + 1 > CARACTERES_POR_TANDA) cerrar();
      actual = actual ? `${actual}\n${renglon}` : renglon.slice(0, CARACTERES_POR_TANDA);
    }
    cerrar();
  }
  cerrar();
  return tandas;
}

/* Lo que entra en una lectura. El navegador lo recorta antes de mandar, para
   poder decirle al dueño qué páginas quedaron afuera; el servidor no confía en
   eso y vuelve a comprobarlo (`lib/ia/archivos.ts`). */
export function recortarPaginas(paginas: readonly { numero: number; texto: string }[]) {
  const entran: { numero: number; texto: string }[] = [];
  let caracteres = 0;
  for (const pagina of paginas) {
    caracteres += pagina.texto.length;
    if (caracteres > CARACTERES_MAXIMOS || entran.length >= PAGINAS_MAXIMAS) break;
    entran.push(pagina);
  }
  return { entran, afuera: paginas.length - entran.length };
}

/* Cuántos renglones de arriba y de abajo de cada página se miran. Un encabezado
   o un pie no pasa de tres; más adentro ya es contenido. */
const RENGLONES_DE_BORDE = 3;

/* Los encabezados y pies que se repiten en las páginas, fuera.
 *
 * Un catálogo de proveedor repite en cada página el nombre del negocio, la
 * dirección y el teléfono: en el de Ferrovolt (63 páginas) eran unos 150
 * caracteres por página, una décima parte de cada tanda, mandados 63 veces para
 * que el modelo los ignore. Se quita lo que aparece igual en el borde de la
 * mitad de las páginas o más. Solo en el borde: adentro de la página un renglón
 * repetido es un dato —«Instalación: empotrada»— y no se toca. Con menos de
 * cuatro páginas no hay de dónde sacar qué es repetido, y se deja todo. */
export function quitarEncabezadosRepetidos<P extends { numero: number; texto: string }>(paginas: readonly P[]): P[] {
  if (paginas.length < 4) return [...paginas];

  /* El borde no pasa de un tercio de la página: en una página corta, arriba y
     abajo se tocarían y un dato del producto contaría como pie. */
  const ancho = (renglones: string[]) => Math.min(RENGLONES_DE_BORDE, Math.floor(renglones.length / 3));
  const borde = (renglones: string[]) =>
    new Set([...renglones.slice(0, ancho(renglones)), ...renglones.slice(renglones.length - ancho(renglones))]);
  const enCuantas = new Map<string, number>();
  for (const { texto } of paginas) {
    for (const renglon of borde(texto.split("\n"))) {
      enCuantas.set(renglon, (enCuantas.get(renglon) ?? 0) + 1);
    }
  }
  const repetidos = new Set(
    [...enCuantas].filter(([, cuantas]) => cuantas >= paginas.length / 2).map(([renglon]) => renglon),
  );
  if (repetidos.size === 0) return [...paginas];

  return paginas.map((pagina) => {
    const renglones = pagina.texto.split("\n");
    const ultimoDeArriba = ancho(renglones);
    const primeroDeAbajo = renglones.length - ancho(renglones);
    const quedan = renglones.filter(
      (renglon, indice) => !((indice < ultimoDeArriba || indice >= primeroDeAbajo) && repetidos.has(renglon)),
    );
    return { ...pagina, texto: quedan.join("\n") };
  });
}

/* La sección de los productos que quedaron en otra tanda que su título.
 *
 * El título «Protección termomagnética» está en la página 7 y sus productos
 * siguen hasta la 10: si la página 9 cae en otra tanda, el modelo no ve el
 * título y devuelve esos productos sin categoría. En el orden del catálogo, un
 * producto sin sección es de la última sección que se nombró, porque un título
 * vale hasta el siguiente. Si nunca se nombró ninguna, siguen sin categoría. */
export function heredarSecciones<P extends { categoria?: string }>(productos: readonly P[]): P[] {
  let ultima = "";
  return productos.map((producto) => {
    const propia = (producto.categoria ?? "").trim();
    if (propia) {
      ultima = propia;
      return producto;
    }
    return ultima ? { ...producto, categoria: ultima } : producto;
  });
}
