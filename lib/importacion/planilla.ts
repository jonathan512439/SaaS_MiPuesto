import {
  MAXIMO_VARIANTES,
  TALLAS_CANONICAS,
  normalizarNombreDePresentacion,
  normalizarNumeroCalzado,
  normalizarTalla,
  type TipoPresentacion,
} from "../catalogo/variantes";
import { analizarPlanilla, columnasDeDatos, type Mapeo, type Planilla } from "./columnas";
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

export type PresentacionDePlanilla = {
  nombre: string;
  /* `null` si cuesta lo mismo que el producto: así sigue al producto si el
     dueño le corrige el precio en la revisión, y le alcanza una promoción. */
  precio: number | null;
  cantidad: number | null;
};

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
  /* Las tallas, números o tamaños, una por fila de la planilla, en el orden en
     que venían. Vacío si el producto se vende de una sola forma. */
  presentaciones: PresentacionDePlanilla[];
  tipoPresentacion: TipoPresentacion | null;
  /* Lo que dice cada columna que no es de las fijas, por su título: «Color»,
     «Potencia (W)». Se cruza con los campos de la categoría al crear. */
  campos: Record<string, string>;
  /* Lo que se ve raro antes de crear —un número de calzado que no es—, para
     decirlo en la revisión y no descubrirlo después. */
  avisos: string[];
};

/* Las filas de ejemplo de la plantilla empiezan con «Ejemplo:». Se dejan
   afuera solas: si el dueño escribe debajo sin borrarlas, no se publican
   productos de muestra. */
const FILA_DE_EJEMPLO = /^ejemplo\s*[:·.-]/i;

export function esFilaDeEjemplo(nombre: string): boolean {
  return FILA_DE_EJEMPLO.test(nombre.trim());
}

function clave(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* «Talla», «Número», «Tamaño» u «Opción», como lo escribiría una persona. */
export function leerTipoPresentacion(texto: string): TipoPresentacion | null {
  const limpio = clave(texto);
  if (limpio === "") return null;
  if (/^talla/.test(limpio)) return "talla";
  if (/^(numero|nro|n°|n\.|calzado)/.test(limpio)) return "numero";
  if (/^(tamano|peso|medida|volumen)/.test(limpio)) return "tamano";
  if (/^(opcion|otra|presentacion|variante)/.test(limpio)) return "presentacion";
  return null;
}

/* Sin columna «Se elige por», el tipo se deduce de lo escrito: si todo es un
   número de calzado, es número; si todo es una talla de las de siempre, es
   talla; si todo lleva una medida, es tamaño. Si no, es una opción cualquiera,
   que no se normaliza y por eso nunca rechaza nada. */
export function deducirTipoPresentacion(nombres: ReadonlyArray<string>): TipoPresentacion {
  if (nombres.length > 0 && nombres.every((nombre) => normalizarNumeroCalzado(nombre) !== null)) {
    return "numero";
  }
  const tallas = new Set(TALLAS_CANONICAS.map((talla) => talla.toLowerCase()));
  if (nombres.length > 0 && nombres.every((nombre) => tallas.has((normalizarTalla(nombre) ?? "").toLowerCase()))) {
    return "talla";
  }
  if (
    nombres.length > 0 &&
    nombres.every((nombre) => /^\d+([.,]\d+)?\s*(kg|g|gr|ml|l|lt|litros?|cm|m|oz)\.?$/i.test(nombre.trim()))
  ) {
    return "tamano";
  }
  return "presentacion";
}

/* De la grilla a productos, con el mapeo que quedó en pantalla —el propuesto o
   el que corrigió el dueño.
 *
 * Todo sale con confianza «alta» y no es un atajo: en una planilla no hay nada
 * que adivinar. El número que está en la celda del precio es el precio. La
 * duda que marca la herramienta de fotos existe porque ahí sí se interpreta una
 * imagen; acá marcar algo como dudoso sería inventar una duda.
 *
 * **Con talla, número o tamaño**, las filas con el mismo nombre y la misma
 * categoría son un solo producto: cada fila es una presentación con su precio y
 * sus existencias. Es como se lleva un inventario de ropa —una fila por talla—
 * y es lo que pide la plantilla. Sin esa columna, dos filas iguales siguen
 * siendo dos productos, como siempre. */
export function productosDeLaPlanilla(
  filas: string[][],
  mapeo: Mapeo,
  cabeceras: ReadonlyArray<string> | null = null,
): { productos: ProductoDePlanilla[]; descartadas: number; ejemplos: number } {
  const productos: ProductoDePlanilla[] = [];
  const porClave = new Map<string, ProductoDePlanilla>();
  const tiposEscritos = new Map<ProductoDePlanilla, string>();
  const datos = columnasDeDatos(cabeceras, mapeo);
  let descartadas = 0;
  let ejemplos = 0;

  for (const fila of filas) {
    const nombre = (fila[mapeo.nombre] ?? "").trim().slice(0, 80);
    const precio = leerPrecio(fila[mapeo.precio] ?? "");

    if (esFilaDeEjemplo(nombre)) {
      ejemplos += 1;
      continue;
    }

    /* Se descarta lo que la base rechazaría igual, y se cuenta cuánto: un
       renglón que desaparece sin dejar rastro es la forma más fácil de que
       alguien publique un catálogo incompleto sin enterarse. */
    if (nombre === "" || precio === null || precio <= 0 || precio > 99_999) {
      descartadas += 1;
      continue;
    }

    const celda = (indice: number | null) => (indice === null ? "" : (fila[indice] ?? "").trim());
    const descripcion = celda(mapeo.descripcion).slice(0, 300);
    const categoria = celda(mapeo.categoria).slice(0, 60);
    const cantidad = mapeo.cantidad === null ? null : leerCantidad(fila[mapeo.cantidad] ?? "");
    const presentacion = celda(mapeo.presentacion).slice(0, 40);
    const campos: Record<string, string> = {};
    for (const { indice, titulo } of datos) {
      const valor = (fila[indice] ?? "").trim();
      if (valor !== "") campos[titulo] = valor;
    }

    const llave = `${clave(nombre)}|${clave(categoria)}`;
    const existente = presentacion === "" ? undefined : porClave.get(llave);

    if (existente) {
      /* Una fila más del mismo producto: suma su presentación. Lo que la
         primera fila no traía —la descripción, un dato— se toma de la que lo
         trae: la plantilla pide escribirlo una vez, no en cada talla. */
      if (existente.presentaciones.some((una) => clave(una.nombre) === clave(presentacion))) {
        descartadas += 1;
        continue;
      }
      existente.presentaciones.push({
        nombre: presentacion,
        precio: precio === existente.precio ? null : precio,
        cantidad,
      });
      if (!existente.descripcion && descripcion) existente.descripcion = descripcion;
      for (const [titulo, valor] of Object.entries(campos)) {
        if (!(titulo in existente.campos)) existente.campos[titulo] = valor;
      }
      if (!tiposEscritos.has(existente) && celda(mapeo.tipoPresentacion)) {
        tiposEscritos.set(existente, celda(mapeo.tipoPresentacion));
      }
      continue;
    }

    const producto: ProductoDePlanilla = {
      nombre,
      precio,
      descripcion,
      categoria,
      confianza: "alta",
      cantidad,
      presentaciones: presentacion === "" ? [] : [{ nombre: presentacion, precio: null, cantidad }],
      tipoPresentacion: null,
      campos,
      avisos: [],
    };
    if (presentacion !== "") {
      porClave.set(llave, producto);
      if (celda(mapeo.tipoPresentacion)) tiposEscritos.set(producto, celda(mapeo.tipoPresentacion));
    }
    productos.push(producto);
  }

  for (const producto of productos) {
    if (producto.presentaciones.length === 0) continue;
    const nombres = producto.presentaciones.map(({ nombre }) => nombre);
    const escrito = tiposEscritos.get(producto);
    const tipo = (escrito ? leerTipoPresentacion(escrito) : null) ?? deducirTipoPresentacion(nombres);
    producto.tipoPresentacion = tipo;

    /* Escritas como las va a guardar la base: «40.5» es «40,5», «m» es «M». Lo
       que no se puede normalizar se deja como está y se avisa: la base lo
       rechazaría, y es mejor saberlo en la revisión. */
    for (const una of producto.presentaciones) {
      const normalizado = normalizarNombreDePresentacion(una.nombre, tipo);
      if (normalizado === null) {
        producto.avisos.push(
          `«${una.nombre}» no es un número de calzado: van de 16 a 50, enteros o con medio.`,
        );
      } else {
        una.nombre = normalizado;
      }
    }
    if (producto.presentaciones.length > MAXIMO_VARIANTES) {
      producto.avisos.push(
        `Tiene ${producto.presentaciones.length} presentaciones y el máximo es ${MAXIMO_VARIANTES}.`,
      );
    }
    /* El precio del producto es el de su primera fila; las que cuestan
       distinto llevan el suyo (arriba). Las existencias del producto son la
       suma: la base las pasa a cada presentación al guardarlas. */
    const conCantidad = producto.presentaciones.filter(({ cantidad }) => cantidad !== null);
    producto.cantidad =
      conCantidad.length === producto.presentaciones.length
        ? conCantidad.reduce((suma, { cantidad }) => suma + (cantidad ?? 0), 0)
        : null;
  }

  return { productos, descartadas, ejemplos };
}
