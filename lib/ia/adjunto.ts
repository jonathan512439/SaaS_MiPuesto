import { detectarTipoImagen, prepararFotoParaLectura } from "../imagenes";

/* Lo que se manda a leer puede ser una foto o un PDF, y no se preparan igual.

   La foto se achica y se recomprime antes de salir: el navegador tiene canvas y
   el archivo original de una cámara pesa varios megabytes por píxeles que no
   ayudan a leer un precio.

   **El PDF no se toca.** No se puede recomprimir sin rasterizarlo, y
   rasterizarlo sería justo lo contrario de lo que conviene: el PDF del
   proveedor trae el texto ya escrito, nítido, sin la sombra ni el ángulo de una
   fotografía. Viaja tal cual llegó. */

export const PESO_MAXIMO_PDF = 4 * 1024 * 1024;

export type AdjuntoParaLectura = {
  base64: string;
  tipo: string;
  /* Una imagen para mostrar al lado de lo leído, así el dueño compara. Un PDF
     no la tiene: en su lugar se muestra el nombre del archivo, que es lo único
     que puede reconocer sin abrirlo. */
  vistaPrevia: string;
  nombre: string;
};

/* `String.fromCharCode(...bytes)` con un archivo de megabytes revienta la pila:
   cada byte es un argumento y hay un límite de cuántos acepta una llamada. Por
   eso va de a pedazos. Ocho mil está muy por debajo del límite de cualquier
   navegador y no se nota en el tiempo. */
function aBase64(bytes: Uint8Array): string {
  const PEDAZO = 8192;
  let binario = "";
  for (let desde = 0; desde < bytes.length; desde += PEDAZO) {
    binario += String.fromCharCode(...bytes.subarray(desde, desde + PEDAZO));
  }
  return btoa(binario);
}

function esPdf(cabecera: Uint8Array): boolean {
  return (
    cabecera[0] === 0x25 &&
    cabecera[1] === 0x50 &&
    cabecera[2] === 0x44 &&
    cabecera[3] === 0x46
  );
}

/* Una planilla no se manda a leer: ya es una tabla, y «Importar una planilla» la
   lee tal cual, gratis y sin interpretar nada. Llegaba acá porque la tarjeta de
   IA es la primera de Herramientas y dice «Carga tu catálogo»; el selector
   escondía el .xlsx, o se rechazaba con «Elige una foto o un PDF», y el dueño
   concluía que MiPuesto no reconoce Excel.

   Por contenido —el .xlsx y el .ods son ZIP, el .xls viejo es OLE— y además por
   nombre, porque un CSV es texto y no tiene firma. Un .docx también es un ZIP,
   pero tampoco es una foto: mandarlo al importador, que sabe decir «eso no es
   una planilla», es mejor que el mensaje de acá. */
const EXTENSIONES_DE_PLANILLA = /\.(xlsx|xlsm|xls|ods|csv|tsv)$/i;

export function esPlanilla(cabecera: Uint8Array, nombre: string): boolean {
  const esZip = cabecera[0] === 0x50 && cabecera[1] === 0x4b && cabecera[2] === 0x03 && cabecera[3] === 0x04;
  const esOle = cabecera[0] === 0xd0 && cabecera[1] === 0xcf && cabecera[2] === 0x11 && cabecera[3] === 0xe0;
  return esZip || esOle || EXTENSIONES_DE_PLANILLA.test(nombre.trim());
}

/* Se mira el contenido y no la extensión ni lo que declara el navegador. Un
   archivo renombrado a `.pdf` pasaría los dos primeros controles y se cortaría
   recién en Google, gastando una de las lecturas del día. */
export async function prepararArchivoParaLectura(archivo: File): Promise<AdjuntoParaLectura> {
  const cabecera = new Uint8Array(await archivo.slice(0, 12).arrayBuffer());

  if (esPdf(cabecera)) {
    if (archivo.size > PESO_MAXIMO_PDF) {
      throw new Error(
        "El PDF debe pesar como máximo 4 MB. Si es un catálogo largo, sube las páginas de tu lista por separado.",
      );
    }
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    return {
      base64: aBase64(bytes),
      tipo: "application/pdf",
      vistaPrevia: "",
      nombre: archivo.name,
    };
  }

  /* El mensaje se decide acá y no en `prepararFotoParaLectura`: esa función la
     comparte la herramienta de producto, donde un PDF no significa nada y
     nombrarlo confundiría. Acá sí es una opción, y hay que decirlo. */
  if (!detectarTipoImagen(cabecera)) {
    throw new Error("Elige una foto (JPG, PNG o WebP) o un PDF.");
  }

  const foto = await prepararFotoParaLectura(archivo);
  return { ...foto, nombre: archivo.name };
}
