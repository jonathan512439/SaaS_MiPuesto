import { decodificarXml } from "./valores";

/* Lector de Excel escrito a mano, sin dependencias.

   Un `.xlsx` es un ZIP con archivos XML adentro. Descomprimirlo lo sabe hacer
   el navegador desde hace años con `DecompressionStream`, y leer las partes que
   hacen falta —el texto compartido y las hojas— es recorrer un XML muy
   previsible.

   **Se descartó SheetJS a propósito.** Lo que hay publicado en npm quedó
   congelado en 2023 con una vulnerabilidad conocida —el proyecto se mudó a su
   propio servidor— y pesa unos 400 KB para un panel que se abre desde un
   teléfono. Este archivo hace lo único que este importador necesita: sacar la
   grilla de celdas como texto.

   Lo que **no** hace, y no necesita: fórmulas sin resultado guardado, fechas
   con formato, gráficos, ni el formato viejo `.xls`, que no es un ZIP y no se
   parece en nada. Cada uno de esos tiene su mensaje en la pantalla en vez de un
   error críptico. */

type EntradaZip = { nombre: string; comprimido: Uint8Array; metodo: number };

export type LecturaXlsx = { filas: string[][]; hojasRevisadas: number };

/* Las etiquetas del XML de un Excel pueden venir con prefijo de espacio de
   nombres o sin él: `<row>` en unos generadores y `<x:row>` en otros. Las dos
   formas son igual de válidas y describen el mismo archivo.

   Buscar solo `<row` devolvía **cero filas** con los del segundo grupo, y el
   dueño veía «la planilla no tiene ninguna fila» mirando una planilla llena.
   Por eso el prefijo se contempla en cada etiqueta, en un solo lugar. */
const PREFIJO = "(?:[A-Za-z0-9_]+:)?";

/* Una etiqueta puede venir cerrada en sí misma. Excel escribe `<c r="B2" s="1"/>`
   para una celda vacía que tiene formato —una celda pintada, o con borde—, y son
   muy comunes.

   Sin contemplarlo, la búsqueda del `</c>` se comía las celdas siguientes hasta
   encontrar uno: la fila perdía columnas y **el precio se corría de lugar sin
   que nada avisara**. Eso es peor que fallar. */
function etiquetas(nombre: string): RegExp {
  return new RegExp(
    `<${PREFIJO}${nombre}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${PREFIJO}${nombre}>)`,
    "g",
  );
}

/* `<t>` y `<v>` se piden con un `>` o un espacio detrás del nombre. Sin eso,
   `<t` también encontraría `<tableParts>`, que existe en las hojas con una
   tabla con formato. */
const TEXTOS = new RegExp(`<${PREFIJO}t(?:\\s[^>]*)?>([\\s\\S]*?)</${PREFIJO}t>`, "g");
const VALOR = new RegExp(`<${PREFIJO}v(?:\\s[^>]*)?>([\\s\\S]*?)</${PREFIJO}v>`);
const COMPARTIDO = new RegExp(`<${PREFIJO}si\\b[^>]*>([\\s\\S]*?)</${PREFIJO}si>`, "g");

function leerNumero(datos: DataView, posicion: number, bytes: 2 | 4): number {
  return bytes === 2 ? datos.getUint16(posicion, true) : datos.getUint32(posicion, true);
}

/* El índice de un ZIP está al final, no al principio: hay que buscar hacia
   atrás la marca del «fin del directorio central». Los últimos 22 bytes
   alcanzan salvo que el archivo tenga comentario, que un Excel nunca tiene;
   igual se buscan los últimos 64 KB, que es el máximo que ese comentario puede
   medir. */
function encontrarDirectorio(bytes: Uint8Array): number {
  const datos = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const desde = Math.max(0, bytes.length - 65_557);
  for (let posicion = bytes.length - 22; posicion >= desde; posicion -= 1) {
    if (leerNumero(datos, posicion, 4) === 0x06054b50) return posicion;
  }
  return -1;
}

function listarEntradas(bytes: Uint8Array): EntradaZip[] {
  const datos = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fin = encontrarDirectorio(bytes);
  if (fin === -1) throw new Error("no-es-zip");

  const cantidad = leerNumero(datos, fin + 10, 2);
  let posicion = leerNumero(datos, fin + 16, 4);
  const entradas: EntradaZip[] = [];

  for (let indice = 0; indice < cantidad; indice += 1) {
    if (leerNumero(datos, posicion, 4) !== 0x02014b50) break;
    const metodo = leerNumero(datos, posicion + 10, 2);
    const comprimido = leerNumero(datos, posicion + 20, 4);
    const largoNombre = leerNumero(datos, posicion + 28, 2);
    const largoExtra = leerNumero(datos, posicion + 30, 2);
    const largoComentario = leerNumero(datos, posicion + 32, 2);
    const cabeceraLocal = leerNumero(datos, posicion + 42, 4);
    const nombre = new TextDecoder().decode(
      bytes.subarray(posicion + 46, posicion + 46 + largoNombre),
    );

    /* El nombre y los extras de la cabecera local pueden medir distinto que los
       del directorio, así que el comienzo de los datos se lee de la cabecera
       local y no se calcula desde acá. Es el error clásico al leer un ZIP. */
    const nombreLocal = leerNumero(datos, cabeceraLocal + 26, 2);
    const extraLocal = leerNumero(datos, cabeceraLocal + 28, 2);
    const inicio = cabeceraLocal + 30 + nombreLocal + extraLocal;

    entradas.push({ nombre, metodo, comprimido: bytes.subarray(inicio, inicio + comprimido) });
    posicion += 46 + largoNombre + largoExtra + largoComentario;
  }

  return entradas;
}

async function descomprimir(entrada: EntradaZip): Promise<string> {
  if (entrada.metodo === 0) return new TextDecoder().decode(entrada.comprimido);
  if (entrada.metodo !== 8) throw new Error("compresion-desconocida");

  const flujo = new Blob([entrada.comprimido as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(flujo).text();
}

/* Cada `<si>` es un texto de la tabla compartida. Puede venir partido en varios
   `<t>` cuando una parte del texto tiene otro formato —una palabra en negrita
   parte el texto en tres—, y hay que pegarlos: si se tomara solo el primero,
   «Coca **Cola** 2 litros» se guardaría como «Coca ». */
function leerTextosCompartidos(xml: string): string[] {
  return [...xml.matchAll(COMPARTIDO)].map(([, contenido]) =>
    decodificarXml([...contenido.matchAll(TEXTOS)].map(([, texto]) => texto).join("")),
  );
}

/* «AB» es la columna 28. Las celdas vacías no se guardan en el archivo, así que
   sin traducir la letra a un número las columnas se correrían: una fila sin
   descripción dejaría el precio donde va la descripción. */
function indiceDeColumna(referencia: string): number {
  const letras = referencia.replace(/\d/g, "");
  let indice = 0;
  for (const letra of letras) indice = indice * 26 + (letra.charCodeAt(0) - 64);
  return indice - 1;
}

function leerHoja(xml: string, compartidos: string[]): string[][] {
  const filas: string[][] = [];

  for (const [, , contenido] of xml.matchAll(etiquetas("row"))) {
    const fila: string[] = [];
    if (contenido === undefined) continue;

    for (const [, atributos, celda] of contenido.matchAll(etiquetas("c"))) {
      const referencia = /r="([A-Z]+\d+)"/.exec(atributos)?.[1];
      /* El nombre del atributo se pide precedido de un espacio o del comienzo:
         sin eso, `dyDescent="0.25"` —que Excel escribe en cada fila— aporta un
         `t="` que se confundiría con el tipo de la celda. */
      const tipo = /(?:^|\s)t="([a-zA-Z]+)"/.exec(atributos)?.[1] ?? "n";
      const columna = referencia ? indiceDeColumna(referencia) : fila.length;
      while (fila.length < columna) fila.push("");

      /* Celda cerrada en sí misma: tiene formato pero no contenido. Se guarda
         vacía, ocupando su lugar, que es lo que mantiene alineadas a las que
         vienen después. */
      if (celda === undefined) {
        fila.push("");
        continue;
      }

      let valor = "";
      if (tipo === "s") {
        const posicion = Number(VALOR.exec(celda)?.[1] ?? "-1");
        valor = compartidos[posicion] ?? "";
      } else if (tipo === "inlineStr") {
        valor = decodificarXml([...celda.matchAll(TEXTOS)].map(([, texto]) => texto).join(""));
      } else {
        valor = decodificarXml(VALOR.exec(celda)?.[1] ?? "");
      }

      fila.push(valor.trim());
    }

    if (fila.some((valor) => valor !== "")) filas.push(fila);
  }

  return filas;
}

/* Las hojas en el orden de las pestañas, que **no** es el orden de los nombres
   de archivo. Excel numera `sheet1.xml`, `sheet2.xml`… por orden de creación:
   quien armó su planilla en la segunda pestaña, o borró y rehízo la primera,
   tiene sus datos en `sheet2.xml` mientras `sheet1.xml` está vacío.

   Leyendo por nombre de archivo, esa planilla daba cero filas y el dueño veía
   «no tiene ninguna fila» con la planilla llena delante. El orden verdadero lo
   dice `workbook.xml`, que apunta a cada hoja por un identificador que
   `workbook.xml.rels` traduce a un archivo. */
async function hojasEnOrdenDePestanas(entradas: EntradaZip[]): Promise<EntradaZip[]> {
  const porNombre = entradas
    .filter(({ nombre }) => /^xl\/worksheets\/sheet[^/]*\.xml$/.test(nombre))
    .sort((una, otra) => una.nombre.localeCompare(otra.nombre, "en", { numeric: true }));

  const libro = entradas.find(({ nombre }) => nombre === "xl/workbook.xml");
  const enlaces = entradas.find(({ nombre }) => nombre === "xl/_rels/workbook.xml.rels");
  if (!libro || !enlaces) return porNombre;

  try {
    const destinos = new Map<string, string>();
    for (const [, atributos] of (await descomprimir(enlaces)).matchAll(
      /<Relationship\b([^>]*)>/g,
    )) {
      const id = /Id="([^"]+)"/.exec(atributos)?.[1];
      const destino = /Target="([^"]+)"/.exec(atributos)?.[1];
      if (!id || !destino) continue;
      /* El destino viene a veces absoluto —«/xl/worksheets/sheet1.xml»— y a
         veces relativo a la carpeta `xl`. Se normalizan las dos formas. */
      const limpio = destino.replace(/^\//, "");
      destinos.set(id, limpio.startsWith("xl/") ? limpio : `xl/${limpio}`);
    }

    const ordenadas: EntradaZip[] = [];
    for (const [, atributos] of (await descomprimir(libro)).matchAll(
      new RegExp(`<${PREFIJO}sheet\\b([^>]*)>`, "g"),
    )) {
      const id = /r:id="([^"]+)"/.exec(atributos)?.[1];
      const ruta = id ? destinos.get(id) : undefined;
      const hoja = porNombre.find(({ nombre }) => nombre === ruta);
      if (hoja && !ordenadas.includes(hoja)) ordenadas.push(hoja);
    }

    /* Las que el libro no nombró van al final igual. Perderlas por un
       `workbook.xml` raro sería cambiar un problema por otro. */
    for (const hoja of porNombre) if (!ordenadas.includes(hoja)) ordenadas.push(hoja);
    return ordenadas;
  } catch {
    return porNombre;
  }
}

export async function leerXlsx(archivo: ArrayBuffer): Promise<LecturaXlsx> {
  const entradas = listarEntradas(new Uint8Array(archivo));
  const hojas = await hojasEnOrdenDePestanas(entradas);
  if (hojas.length === 0) throw new Error("sin-hoja");

  const tabla = entradas.find(({ nombre }) => nombre === "xl/sharedStrings.xml");
  const compartidos = tabla ? leerTextosCompartidos(await descomprimir(tabla)) : [];

  /* Se devuelve la primera hoja que tenga datos, no la primera a secas. Una
     portada vacía, una hoja de instrucciones o una que quedó de un borrador no
     tienen por qué frenar la importación de la que sí tiene la lista. */
  for (const hoja of hojas) {
    const filas = leerHoja(await descomprimir(hoja), compartidos);
    if (filas.length > 0) return { filas, hojasRevisadas: hojas.length };
  }

  return { filas: [], hojasRevisadas: hojas.length };
}
