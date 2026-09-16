/* Escritor de Excel a mano, sin dependencias.
 *
 * El espejo de `lib/importacion/xlsx.ts`, y por el mismo motivo: lo publicado en
 * npm para esto pesa cientos de kilobytes y arrastra una vulnerabilidad
 * conocida, para un trabajo que acá es armar cinco archivos XML muy previsibles
 * y meterlos en un ZIP.
 *
 * **Sin comprimir, a propósito.** Un ZIP admite entradas guardadas tal cual, y
 * Excel las abre igual. Comprimirlas pediría un `CompressionStream` —que existe,
 * pero es asíncrono y obliga a que todo el armado lo sea— a cambio de unos pocos
 * kilobytes en un archivo que a lo sumo tiene trescientos renglones. El precio
 * no vale la complicación.
 *
 * **Todo el texto va en línea** (`t="inlineStr"`) y no en la tabla de cadenas
 * compartidas. La tabla ahorra espacio cuando el mismo texto se repite mucho, lo
 * que acá no pasa: son nombres de productos, casi todos distintos. Sin ella se
 * escribe un archivo menos y se evita mantener dos estructuras que tienen que
 * coincidir. El lector del importador entiende las dos formas.
 *
 * Lo que **no** hace, y no necesita: formatos, fórmulas, varias hojas, ni
 * fechas. Todo se escribe como texto o como número.
 *
 * **Lleva una hoja de estilos vacía, y no es opcional.** Excel exige la parte
 * `xl/styles.xml` aunque ninguna celda declare estilo: cada celda referencia
 * implícitamente el estilo cero, y sin esa parte ese cero no existe. Un lector
 * cualquiera —el del importador, `openpyxl`, un descompresor— abre el archivo
 * sin protestar; Excel lo «repara», y reparar significa **tirar la hoja de
 * datos y dejar la pestaña vacía con su nombre**. El síntoma no se parece en
 * nada a la causa: parece que la exportación no encontró productos. */

/* La tabla de CRC-32 que pide el formato ZIP. Se calcula una vez. */
const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let valor = i;
    for (let bit = 0; bit < 8; bit += 1) {
      valor = valor & 1 ? 0xedb88320 ^ (valor >>> 1) : valor >>> 1;
    }
    tabla[i] = valor >>> 0;
  }
  return tabla;
})();

function crc32(bytes: Uint8Array): number {
  let resto = 0xffffffff;
  for (const byte of bytes) {
    resto = TABLA_CRC[(resto ^ byte) & 0xff] ^ (resto >>> 8);
  }
  return (resto ^ 0xffffffff) >>> 0;
}

/* Lo que no se escapa rompe el archivo entero, no la celda: un `&` suelto deja
   el XML mal formado y Excel se niega a abrirlo diciendo que está dañado, sin
   decir dónde. Un nombre de producto como «Café & té» alcanza. */
function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Los caracteres de control no son XML válido, ni siquiera escapados. Vienen de
   pegar desde otro programa, y no se ven: el dueño exportaría un archivo que no
   abre y no habría forma de que entienda por qué. */
function limpiar(texto: string): string {
  /* Escritos como escapes y no como los caracteres de verdad: un carácter de
     control metido tal cual en el código fuente es invisible, y cualquier
     herramienta que reescriba el archivo puede comérselo sin que nadie lo note.
     Escapados, se leen y sobreviven. */
  return texto.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

/* «A», «B», … «Z», «AA». Excel nombra cada celda por su columna y su fila. */
function nombreDeColumna(indice: number): string {
  let nombre = "";
  let resto = indice;
  while (resto >= 0) {
    nombre = String.fromCharCode(65 + (resto % 26)) + nombre;
    resto = Math.floor(resto / 26) - 1;
  }
  return nombre;
}

/* Un valor que Excel debe tratar como número y no como texto.
 *
 * Importa para el precio: escrito como texto, la columna queda alineada a la
 * izquierda, no suma, y al reimportarla un Excel en español puede interpretar la
 * coma decimal a su manera. Se acepta solo la forma que el XML entiende —punto
 * decimal, sin separador de miles— y cualquier otra cosa viaja como texto, que
 * es visible pero inofensivo. */
function esNumero(valor: string): boolean {
  return valor !== "" && /^-?\d+(\.\d+)?$/.test(valor);
}

function celda(referencia: string, valor: string): string {
  if (valor === "") return "";
  if (esNumero(valor)) return `<c r="${referencia}"><v>${valor}</v></c>`;
  return `<c r="${referencia}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(limpiar(valor))}</t></is></c>`;
}

function hoja(filas: ReadonlyArray<ReadonlyArray<string>>): string {
  const cuerpo = filas
    .map((fila, numero) => {
      const celdas = fila
        .map((valor, columna) => celda(`${nombreDeColumna(columna)}${numero + 1}`, valor))
        .join("");
      return `<row r="${numero + 1}">${celdas}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${cuerpo}</sheetData></worksheet>`;
}

type Archivo = { nombre: string; contenido: Uint8Array };

function escribirZip(archivos: Archivo[]): Uint8Array {
  const trozos: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let desplazamiento = 0;

  const codificador = new TextEncoder();

  for (const archivo of archivos) {
    const nombre = codificador.encode(archivo.nombre);
    const suma = crc32(archivo.contenido);
    const largo = archivo.contenido.length;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // versión necesaria
    local.setUint16(6, 0, true); // sin banderas
    local.setUint16(8, 0, true); // método 0: guardado sin comprimir
    local.setUint16(10, 0, true); // hora
    local.setUint16(12, 0x21, true); // fecha: 1980-01-01, fija y reproducible
    local.setUint32(14, suma, true);
    local.setUint32(18, largo, true);
    local.setUint32(22, largo, true);
    local.setUint16(26, nombre.length, true);
    local.setUint16(28, 0, true); // sin campo extra

    trozos.push(new Uint8Array(local.buffer), nombre, archivo.contenido);

    const entrada = new DataView(new ArrayBuffer(46));
    entrada.setUint32(0, 0x02014b50, true);
    entrada.setUint16(4, 20, true); // versión que lo escribió
    entrada.setUint16(6, 20, true); // versión necesaria
    entrada.setUint16(8, 0, true);
    entrada.setUint16(10, 0, true);
    entrada.setUint16(12, 0, true);
    entrada.setUint16(14, 0x21, true);
    entrada.setUint32(16, suma, true);
    entrada.setUint32(20, largo, true);
    entrada.setUint32(24, largo, true);
    entrada.setUint16(28, nombre.length, true);
    entrada.setUint16(30, 0, true);
    entrada.setUint16(32, 0, true); // sin comentario
    entrada.setUint16(34, 0, true); // disco
    entrada.setUint16(36, 0, true); // atributos internos
    entrada.setUint32(38, 0, true); // atributos externos
    entrada.setUint32(42, desplazamiento, true);

    central.push(new Uint8Array(entrada.buffer), nombre);
    desplazamiento += 30 + nombre.length + largo;
  }

  const largoCentral = central.reduce((suma, parte) => suma + parte.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(4, 0, true);
  fin.setUint16(6, 0, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, largoCentral, true);
  fin.setUint32(16, desplazamiento, true);
  fin.setUint16(20, 0, true);

  const partes = [...trozos, ...central, new Uint8Array(fin.buffer)];
  const total = partes.reduce((suma, parte) => suma + parte.length, 0);
  const salida = new Uint8Array(total);
  let posicion = 0;
  for (const parte of partes) {
    salida.set(parte, posicion);
    posicion += parte.length;
  }
  return salida;
}

/* El nombre de la pestaña. Excel rechaza el archivo entero si lleva alguno de
   estos caracteres o si pasa de 31, y lo rechaza sin explicar cuál era. */
function nombreDeHoja(propuesto: string): string {
  const limpio = propuesto.replace(/[\\/?*[\]:]/g, " ").trim();
  return (limpio === "" ? "Catálogo" : limpio).slice(0, 31);
}

export function armarXlsx(
  filas: ReadonlyArray<ReadonlyArray<string>>,
  nombreHoja = "Catálogo",
): Uint8Array {
  const codificador = new TextEncoder();
  const texto = (contenido: string) => codificador.encode(contenido);

  return escribirZip([
    {
      nombre: "[Content_Types].xml",
      contenido: texto(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      ),
    },
    {
      nombre: "_rels/.rels",
      contenido: texto(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      ),
    },
    {
      nombre: "xl/workbook.xml",
      contenido: texto(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escaparXml(nombreDeHoja(nombreHoja))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      ),
    },
    {
      nombre: "xl/_rels/workbook.xml.rels",
      contenido: texto(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      ),
    },
    /* El mínimo que Excel acepta. Los dos rellenos son obligatorios —«ninguno» y
       «gris 125»— aunque no se use ninguno: Excel da por hecho que están y
       cuenta a partir de ahí. */
    {
      nombre: "xl/styles.xml",
      contenido: texto(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/></styleSheet>',
      ),
    },
    { nombre: "xl/worksheets/sheet1.xml", contenido: texto(hoja(filas)) },
  ]);
}
