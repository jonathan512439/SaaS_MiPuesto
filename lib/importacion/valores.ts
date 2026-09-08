/* Leer un número escrito por una persona, no por una máquina.

   El precio de una planilla boliviana llega escrito de todas las formas
   posibles: «12», «12,50», «12.50», «Bs 12», «12 Bs», «1.250,00». El Excel en
   español usa coma decimal y el mismo Excel exporta CSV con punto y coma; el
   mismo archivo abierto en otra computadora sale al revés. Adivinar mal acá
   convierte doce con cincuenta en mil doscientos cincuenta, que es el peor
   error que puede cometer este importador: se publica y se cobra. */

const SIMBOLOS = /(?:bs\.?|b\/|\$us|\$|usd)/gi;

export function leerPrecio(texto: string): number | null {
  const limpio = texto.replace(SIMBOLOS, "").replace(/\s/g, "").trim();
  if (limpio === "") return null;
  if (!/^[-+]?[\d.,]+$/.test(limpio)) return null;

  const ultimaComa = limpio.lastIndexOf(",");
  const ultimoPunto = limpio.lastIndexOf(".");

  let normalizado: string;
  if (ultimaComa === -1 && ultimoPunto === -1) {
    normalizado = limpio;
  } else if (ultimaComa > -1 && ultimoPunto > -1) {
    /* Están los dos: el que va último es el decimal y el otro separa miles.
       «1.250,00» y «1,250.00» son el mismo precio escrito en dos países. */
    const decimal = Math.max(ultimaComa, ultimoPunto);
    normalizado =
      limpio.slice(0, decimal).replace(/[.,]/g, "") + "." + limpio.slice(decimal + 1);
  } else {
    const separador = ultimaComa > -1 ? ultimaComa : ultimoPunto;
    const decimales = limpio.length - separador - 1;
    /* Un solo separador con exactamente tres cifras detrás es ambiguo de
       verdad: «1.250» son mil doscientos cincuenta en una planilla y uno con
       veinticinco en otra. Se lee como miles, que es lo que casi siempre es en
       una lista de precios boliviana, donde los centavos se escriben con dos
       cifras o no se escriben. */
    const esMiles = decimales === 3 && /^[\d]{1,3}$/.test(limpio.slice(0, separador));
    normalizado = esMiles
      ? limpio.replace(/[.,]/g, "")
      : limpio.slice(0, separador) + "." + limpio.slice(separador + 1).replace(/[.,]/g, "");
  }

  const valor = Number(normalizado);
  return Number.isFinite(valor) ? valor : null;
}

/* La cantidad en existencia, cuando la planilla la trae. Reusa la lectura del
   precio porque los separadores de miles son los mismos problemas: «1.250»
   unidades se escribe igual que «1.250» bolivianos.

   Se redondea en vez de rechazar un «12,5»: hay planillas donde la existencia
   se lleva en kilos y el catálogo cuenta unidades. El número queda a la vista en
   un campo que se puede editar, así que el dueño corrige lo que no le sirva; lo
   que no se puede es guardar medio producto, porque la base pide un entero. */
export function leerCantidad(texto: string): number | null {
  const valor = leerPrecio(texto);
  if (valor === null || valor < 0 || valor > 999_999) return null;
  return Math.round(valor);
}

/* Las entidades que aparecen de verdad en el XML de un Excel. `&amp;` va al
   final: si se reemplazara primero, un «&amp;lt;» escrito literalmente en una
   celda se convertiría en «<» y rompería el texto del dueño. */
export function decodificarXml(texto: string): string {
  return texto
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, codigo) => String.fromCodePoint(Number.parseInt(codigo, 16)))
    .replace(/&#(\d+);/g, (_, codigo) => String.fromCodePoint(Number(codigo)))
    .replace(/&amp;/g, "&");
}
