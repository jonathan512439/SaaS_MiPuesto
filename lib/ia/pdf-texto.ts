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
