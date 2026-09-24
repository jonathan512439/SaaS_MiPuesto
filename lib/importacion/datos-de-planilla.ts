import type { Atributo } from "../catalogo/atributos";
import { LARGO_VALOR_TEXTO, type ValorAtributo } from "../catalogo/valores";
import { leerPrecio } from "./valores";

/* Las columnas de datos de una planilla, cruzadas con los campos de la
   categoría de destino.
 *
 * La columna se reconoce por el título: «Color» es el campo Color; «Potencia
 * (W)» es Potencia —lo de entre paréntesis es la unidad que la plantilla pone
 * para que se sepa qué escribir—. Sin importar tildes ni mayúsculas, porque así
 * escribe la gente.
 *
 * Cada valor se escribe como lo va a pedir `validarValores`: «Sí» es `true`,
 * «e27» es la opción «E27», «9 W» es 9. **Lo que no calza se deja afuera y se
 * dice**, en vez de mandarlo: la ruta de productos rechaza el producto entero
 * por un valor que no es opción, y perder un producto por un «Otoño» mal
 * escrito sería peor que perder el dato.
 */

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* «Potencia (W)» → «potencia». */
function tituloSinUnidad(titulo: string): string {
  return normalizar(titulo.replace(/\([^)]*\)\s*$/, ""));
}

const SI = new Set(["si", "s", "x", "yes", "true", "1", "verdadero"]);
const NO = new Set(["no", "n", "false", "0", "falso"]);

function leerValor(
  atributo: Atributo,
  escrito: string,
): { valor: ValorAtributo } | { problema: string } {
  const texto = escrito.trim();

  if (atributo.tipo === "si_no") {
    const llave = normalizar(texto);
    if (SI.has(llave)) return { valor: true };
    if (NO.has(llave)) return { valor: false };
    return { problema: `${atributo.nombre} se escribe «Sí» o «No», y decía «${texto}»` };
  }

  if (atributo.tipo === "opcion") {
    const elegida = atributo.opciones.find((opcion) => normalizar(opcion) === normalizar(texto));
    return elegida
      ? { valor: elegida }
      : {
          problema: `${atributo.nombre} admite ${atributo.opciones.join(", ")}, y decía «${texto}»`,
        };
  }

  if (atributo.tipo === "numero") {
    /* «9 W», «15.000 horas», «4 litros»: se toma el número del principio. */
    const numero = leerPrecio(/^[\d.,\s]+/.exec(texto)?.[0]?.trim() ?? "");
    return numero !== null && numero >= 0
      ? { valor: numero }
      : { problema: `${atributo.nombre} tiene que ser un número, y decía «${texto}»` };
  }

  return texto.length > LARGO_VALOR_TEXTO
    ? { problema: `${atributo.nombre} admite hasta ${LARGO_VALOR_TEXTO} caracteres` }
    : { valor: texto };
}

export function valoresDesdePlanilla(
  atributos: ReadonlyArray<Atributo>,
  campos: Readonly<Record<string, string>>,
): { valores: Record<string, ValorAtributo>; problemas: string[] } {
  const valores: Record<string, ValorAtributo> = {};
  const problemas: string[] = [];

  for (const [titulo, escrito] of Object.entries(campos)) {
    if (escrito.trim() === "") continue;
    const llave = tituloSinUnidad(titulo);
    const atributo = atributos.find(
      ({ nombre, clave }) => normalizar(nombre) === llave || clave === llave.replace(/ /g, "_"),
    );
    /* Una columna que no es campo de esta categoría no es un error: la
       plantilla lleva en una sola hoja los datos de todas, y cada fila completa
       los de la suya. */
    if (!atributo || atributo.clave in valores) continue;

    const leido = leerValor(atributo, escrito);
    if ("valor" in leido) valores[atributo.clave] = leido.valor;
    else problemas.push(leido.problema);
  }

  return { valores, problemas };
}
