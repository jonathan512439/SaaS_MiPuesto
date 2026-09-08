import { analizarPlanilla, type Mapeo, type Planilla } from "./columnas";
import { leerCsv } from "./csv";
import { leerCantidad, leerPrecio } from "./valores";
import { leerXlsx } from "./xlsx";

/* La puerta de entrada del importador: un archivo que eligió el dueño, y del
   otro lado una grilla con una propuesta de qué columna es cuál.

   **No pasa por la inteligencia artificial, a propósito.** Un Excel ya es una
   tabla: el nombre está en su columna y el precio en la suya. Mandarlo a leer
   sería gastar una de las llamadas del día en algo que el navegador resuelve
   solo, y peor, arriesgar que un precio exacto vuelva cambiado. Por eso esta
   importación es gratis, no tiene tope y no depende de que Google conteste. */

/* Trescientos renglones son más productos de los que tiene casi cualquier
   catálogo de barrio, y son los que una pantalla de revisión puede dibujar en
   un teléfono sin trabarse: cada fila son tres campos de texto. Lo que sobra no
   se descarta en silencio, se avisa. */
export const MAXIMO_FILAS = 300;

export type ResultadoLectura = Planilla & { recortada: boolean; totalLeido: number };

function empiezaCon(bytes: Uint8Array, firma: number[]): boolean {
  return firma.every((byte, indice) => bytes[indice] === byte);
}

/* El Excel en español guarda el CSV en la codificación vieja de Windows, no en
   UTF-8. Sin este intento, «Azúcar» llega como «Az?car» y el dueño ve su
   catálogo lleno de símbolos raros sin entender por qué.

   Se prueba UTF-8 en modo estricto primero: si el archivo es UTF-8 de verdad,
   se lee bien, y si no lo es, falla en vez de devolver basura silenciosamente,
   que es justo la señal que hace falta para probar la otra. */
function decodificarTexto(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export async function leerArchivoDePlanilla(archivo: File): Promise<ResultadoLectura> {
  const contenido = await archivo.arrayBuffer();
  const bytes = new Uint8Array(contenido);

  let filas: string[][];
  let hojasRevisadas = 0;

  if (empiezaCon(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    /* Un `.xlsx` es un ZIP. También lo son un `.docx` y un `.odt`, así que el
       lector puede no encontrar una hoja: ahí se traduce a algo que se entienda
       en vez de dejar salir el error técnico. */
    try {
      const lectura = await leerXlsx(contenido);
      filas = lectura.filas;
      hojasRevisadas = lectura.hojasRevisadas;
    } catch (error) {
      if (error instanceof Error && error.message === "sin-hoja") {
        throw new Error("Ese archivo comprimido no es una planilla de Excel.");
      }
      throw new Error("No pudimos abrir esa planilla. Probá guardarla de nuevo como .xlsx o como CSV.");
    }
  } else if (empiezaCon(bytes, [0xd0, 0xcf, 0x11, 0xe0])) {
    /* El `.xls` viejo, anterior a 2007, no es un ZIP y no se parece en nada:
       leerlo sería otro lector entero. Se dice qué hacer, que son dos clics. */
    throw new Error(
      "Ese Excel está en el formato viejo (.xls). Abrilo y usá «Guardar como» eligiendo .xlsx o CSV.",
    );
  } else if (empiezaCon(bytes, [0x25, 0x50, 0x44, 0x46])) {
    /* El PDF tiene su propia herramienta, y es la que corresponde: un PDF no es
       una tabla y hay que interpretarlo. Se manda para allá en vez de decir
       que el archivo no sirve. */
    throw new Error(
      "Eso es un PDF. Los PDF se leen con la herramienta «Cargar desde una foto», que sí sabe interpretarlos.",
    );
  } else {
    filas = leerCsv(decodificarTexto(bytes));
  }

  /* El mensaje dice qué se miró y no solo que no se encontró nada. «No tiene
     ninguna fila» delante de una planilla llena no le sirve a nadie: lo que hay
     que saber es que se revisaron todas las hojas, para poder mirar si los
     datos están en otro archivo o en otro libro. */
  if (filas.length === 0) {
    throw new Error(
      hojasRevisadas > 0
        ? `Abrimos tu Excel y revisamos sus ${hojasRevisadas} hoja(s), pero ninguna tiene filas con datos. Fijate que estés subiendo el archivo correcto.`
        : "La planilla no tiene ninguna fila con datos.",
    );
  }

  const totalLeido = filas.length;
  const recortada = totalLeido > MAXIMO_FILAS + 1;

  return {
    ...analizarPlanilla(recortada ? filas.slice(0, MAXIMO_FILAS + 1) : filas),
    recortada,
    totalLeido,
  };
}

export type ProductoDePlanilla = {
  nombre: string;
  precio: number;
  descripcion: string;
  categoria: string;
  confianza: "alta";
  /* `null` significa «la planilla no dice». No es lo mismo que cero: cero es
     «no queda ninguno» y se publica como agotado. Si se confundieran, importar
     una planilla sin columna de existencias dejaría el catálogo entero
     agotado. */
  cantidad: number | null;
};

/* De la grilla a productos, con el mapeo que quedó en pantalla —el propuesto o
   el que corrigió el dueño.
 *
 * Todo sale con confianza «alta» y no es un atajo: en una planilla no hay nada
 * que adivinar. El número que está en la celda del precio es el precio. La
 * duda que marca la herramienta de fotos existe porque ahí sí se interpreta una
 * imagen; acá marcar algo como dudoso sería inventar una duda. */
export function productosDeLaPlanilla(
  filas: string[][],
  mapeo: Mapeo,
): { productos: ProductoDePlanilla[]; descartadas: number } {
  const productos: ProductoDePlanilla[] = [];
  let descartadas = 0;

  for (const fila of filas) {
    const nombre = (fila[mapeo.nombre] ?? "").trim().slice(0, 80);
    const precio = leerPrecio(fila[mapeo.precio] ?? "");

    /* Se descarta lo que la base rechazaría igual, y se cuenta cuánto: un
       renglón que desaparece sin dejar rastro es la forma más fácil de que
       alguien publique un catálogo incompleto sin enterarse. */
    if (nombre === "" || precio === null || precio <= 0 || precio > 99_999) {
      descartadas += 1;
      continue;
    }

    productos.push({
      nombre,
      precio,
      descripcion:
        mapeo.descripcion === null ? "" : (fila[mapeo.descripcion] ?? "").trim().slice(0, 300),
      categoria:
        mapeo.categoria === null ? "" : (fila[mapeo.categoria] ?? "").trim().slice(0, 60),
      confianza: "alta",
      cantidad: mapeo.cantidad === null ? null : leerCantidad(fila[mapeo.cantidad] ?? ""),
    });
  }

  return { productos, descartadas };
}
