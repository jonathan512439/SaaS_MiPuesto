import { decodificarXml } from "./valores";

/* Lector de Excel escrito a mano, sin dependencias.

   Un `.xlsx` es un ZIP con archivos XML adentro. Descomprimirlo lo sabe hacer
   el navegador desde hace años con `DecompressionStream`, y leer las dos partes
   que hacen falta —el texto compartido y la primera hoja— es recorrer un XML de
   forma muy previsible.

   **Se descartó SheetJS a propósito.** Lo que hay publicado en npm quedó
   congelado en 2023 con una vulnerabilidad conocida —el proyecto se mudó a su
   propio servidor— y pesa unos 400 KB para un panel que se abre desde un
   teléfono. Este archivo hace lo único que este importador necesita: sacar la
   grilla de celdas como texto.

   Lo que **no** hace, y no necesita: fórmulas sin resultado guardado, fechas
   con formato, hojas que no sean la primera, gráficos, ni el formato viejo
   `.xls`, que no es un ZIP y no se parece en nada. Cada uno de esos tiene su
   mensaje en la pantalla en vez de un error críptico. */

type EntradaZip = { nombre: string; comprimido: Uint8Array; metodo: number };

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
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(([, contenido]) =>
    decodificarXml(
      [...contenido.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(([, texto]) => texto).join(""),
    ),
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

  for (const [, contenido] of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const fila: string[] = [];

    for (const [, atributos, celda] of contenido.matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const referencia = /r="([A-Z]+\d+)"/.exec(atributos)?.[1];
      const tipo = /t="([a-zA-Z]+)"/.exec(atributos)?.[1] ?? "n";
      const columna = referencia ? indiceDeColumna(referencia) : fila.length;
      while (fila.length < columna) fila.push("");

      let valor = "";
      if (tipo === "s") {
        const posicion = Number(/<v>([\s\S]*?)<\/v>/.exec(celda)?.[1] ?? "-1");
        valor = compartidos[posicion] ?? "";
      } else if (tipo === "inlineStr") {
        valor = decodificarXml(
          [...celda.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(([, texto]) => texto).join(""),
        );
      } else {
        valor = decodificarXml(/<v>([\s\S]*?)<\/v>/.exec(celda)?.[1] ?? "");
      }

      fila.push(valor.trim());
    }

    if (fila.some((valor) => valor !== "")) filas.push(fila);
  }

  return filas;
}

export async function leerXlsx(archivo: ArrayBuffer): Promise<string[][]> {
  const entradas = listarEntradas(new Uint8Array(archivo));

  /* La primera hoja por nombre de archivo, que es el orden en que Excel las
     numera. Leer `workbook.xml` para respetar el orden de las pestañas sería lo
     correcto en general, y acá no cambia nada: una lista de precios que ocupa
     varias hojas no es el caso que este importador atiende, y la pantalla lo
     dice antes de empezar. */
  const hoja = entradas
    .filter(({ nombre }) => /^xl\/worksheets\/sheet\d+\.xml$/.test(nombre))
    .sort((una, otra) => una.nombre.localeCompare(otra.nombre, "en", { numeric: true }))[0];
  if (!hoja) throw new Error("sin-hoja");

  const tabla = entradas.find(({ nombre }) => nombre === "xl/sharedStrings.xml");
  const compartidos = tabla ? leerTextosCompartidos(await descomprimir(tabla)) : [];

  return leerHoja(await descomprimir(hoja), compartidos);
}
