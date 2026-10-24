import { LARGO_NOMBRE, LARGO_UNIDAD, MAXIMO_ATRIBUTOS, MAXIMO_EN_TARJETA, type TipoAtributo } from "../catalogo/atributos";
import { leerSiNo, tituloSinUnidad } from "./datos-de-planilla";

/* Los campos con los que nace una categoría que crea una importación.
 *
 * Una planilla con «Color», «Material» y «Capacidad (litros)» —o un PDF que los
 * trae escritos en cada renglón— ya dice cómo es la categoría. Antes la
 * categoría se creaba vacía y esos datos se perdían: el dueño tenía que armar
 * los campos a mano y volver a cargar producto por producto lo que estaba en
 * el archivo. Ahora la categoría nace con un campo por columna, y los valores
 * entran en el mismo paso.
 *
 * Solo para las categorías **nuevas**. A una que ya existe no se le agregan
 * campos: su diseño lo decidió el dueño, y una importación no lo cambia sin
 * preguntar.
 */

export type CampoPropuesto = {
  nombre: string;
  tipo: TipoAtributo;
  unidad: string | null;
  opciones: string[];
  enTarjeta: boolean;
};

/* Lo que una planilla de inventario trae para uso de la casa y no se publica.
 * Los campos se ven en la ficha pública del producto: una columna «Costo» que
 * se volviera campo le mostraría al cliente cuánto pagó el dueño. Se compara
 * por palabra entera del título. Los precios también quedan afuera: el precio
 * de un producto lo calcula `lib/precios.ts` y no un campo de texto. */
const INTERNAS = new Set([
  "costo", "costos", "compra", "proveedor", "proveedores", "ganancia", "margen", "utilidad",
  "codigo", "cod", "sku", "id", "ref", "referencia", "barra", "barras",
  "stock", "existencia", "existencias", "inventario", "minimo", "ubicacion", "estante", "almacen", "deposito",
  "interno", "interna", "nota", "notas", "observacion", "observaciones",
  "precio", "precios", "bs", "usd", "dolar", "dolares", "descuento", "oferta", "mayorista",
]);

export function esColumnaInterna(titulo: string): boolean {
  return tituloSinUnidad(titulo)
    .split(/[^a-z0-9]+/)
    .some((palabra) => INTERNAS.has(palabra));
}

const NUMERO_SOLO = /^\d+(?:[.,]\d+)?$/;
const NUMERO_AL_PRINCIPIO = /^\d+(?:[.,]\d+)?(?:\s|$)/;

/* El tipo, por lo que dicen los valores. Se elige el más estricto que
 * aceptan **todos**: si uno solo no encaja, el campo es de texto, que acepta
 * cualquier cosa. Un número que rechazara un valor perdería ese dato, y un
 * campo de texto no pierde ninguno. La lista de opciones no se deduce nunca: con
 * diez productos no se sabe cuáles son las opciones posibles, solo cuáles
 * aparecieron, y la próxima importación con una nueva fallaría. */
function tipoPorValores(valores: string[], unidad: string | null): TipoAtributo {
  const siNo = valores.every((valor) => leerSiNo(valor) !== null);
  /* «1» y «0» se leen como sí y no, pero una columna de puros números es un
     número: hace falta al menos una palabra para que sea sí o no. */
  if (siNo && valores.some((valor) => !NUMERO_SOLO.test(valor.trim()))) return "si_no";
  const numero = unidad
    ? valores.every((valor) => NUMERO_AL_PRINCIPIO.test(valor.trim()))
    : valores.every((valor) => NUMERO_SOLO.test(valor.trim()));
  return numero ? "numero" : "texto";
}

function conMayuscula(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase("es") + texto.slice(1);
}

/* «Capacidad (litros)» → «Capacidad» con unidad «litros». */
function partirTitulo(titulo: string): { nombre: string; unidad: string | null } {
  const unidad = /\(([^)]*)\)\s*$/.exec(titulo)?.[1]?.trim() ?? "";
  const nombre = titulo.replace(/\([^)]*\)\s*$/, "").replace(/\s+/g, " ").trim();
  return {
    nombre: conMayuscula(nombre).slice(0, LARGO_NOMBRE),
    unidad: unidad && unidad.length <= LARGO_UNIDAD ? unidad : null,
  };
}

/* Los campos para una categoría nueva, a partir de los datos de sus productos:
   las columnas de la planilla o los datos que leyó la IA, por su título. En el
   orden en que aparecen, sin repetidos, sin columnas vacías y hasta el máximo
   que admite la base. Los tres primeros se ven en la tarjeta, que es donde
   el cliente compara. */
export function camposDeCategoriaNueva(
  productos: ReadonlyArray<{ campos?: Readonly<Record<string, string>> }>,
): CampoPropuesto[] {
  const valoresPorTitulo = new Map<string, string[]>();
  for (const { campos } of productos) {
    for (const [titulo, valor] of Object.entries(campos ?? {})) {
      const limpio = valor.trim();
      if (!titulo.trim() || !limpio || esColumnaInterna(titulo)) continue;
      const valores = valoresPorTitulo.get(titulo) ?? [];
      valores.push(limpio);
      valoresPorTitulo.set(titulo, valores);
    }
  }

  const propuestos: CampoPropuesto[] = [];
  const nombres = new Set<string>();
  for (const [titulo, valores] of valoresPorTitulo) {
    const { nombre, unidad } = partirTitulo(titulo);
    const llave = tituloSinUnidad(nombre);
    if (!nombre || nombres.has(llave)) continue;
    nombres.add(llave);
    const tipo = tipoPorValores(valores, unidad);
    propuestos.push({
      nombre,
      tipo,
      unidad: tipo === "numero" ? unidad : null,
      opciones: [],
      enTarjeta: propuestos.length < Math.min(3, MAXIMO_EN_TARJETA),
    });
    if (propuestos.length === MAXIMO_ATRIBUTOS) break;
  }
  return propuestos;
}
