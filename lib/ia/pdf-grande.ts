import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import direccionDelTrabajador from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

import { paginaTieneTexto, renglonesDePagina, type TrozoDeTexto } from "./pdf-texto";

/* Abre un PDF grande en el navegador, para que sus fotos no tengan que subirse.
 *
 * Se carga recién cuando el dueño elige un PDF de más de 4 MB
 * (`components/catalogo/carga-desde-foto.tsx`, con `import()`): pdf.js pesa casi
 * un mega y nadie más en el panel lo necesita. La versión `legacy` es la que
 * funciona en los celulares con un navegador de hace unos años, que son los de
 * muchos comerciantes.
 *
 * El resto de esto vive en `pdf-texto.ts`, que se prueba sin navegador. */

GlobalWorkerOptions.workerSrc = direccionDelTrabajador;

export type PaginaConTexto = { numero: number; texto: string };

export type PdfAbierto = {
  documento: PDFDocumentProxy;
  total: number;
  paginas: PaginaConTexto[];
  /* Las que no traen texto: escaneadas, o exportadas como imagen. */
  sinTexto: number[];
};

/* Por qué no se pudo abrir, en las palabras del dueño. */
export class PdfIlegible extends Error {}

/* Cuánto puede pesar lo que se abre en el teléfono: el archivo entero queda en
   la memoria mientras se lee, y un celular de gama media no da para más. */
export const PESO_MAXIMO_EN_NAVEGADOR = 150 * 1024 * 1024;

export async function abrirPdf(
  archivo: File,
  alAvanzar: (hecho: number, total: number) => void,
): Promise<PdfAbierto> {
  if (archivo.size > PESO_MAXIMO_EN_NAVEGADOR) {
    throw new PdfIlegible("Este PDF es demasiado grande para abrirlo en tu teléfono.");
  }

  let documento: PDFDocumentProxy;
  try {
    documento = await getDocument({ data: await archivo.arrayBuffer() }).promise;
  } catch (error) {
    const conClave = error instanceof Error && error.name === "PasswordException";
    throw new PdfIlegible(
      conClave ? "Este PDF tiene contraseña y no podemos abrirlo." : "No pudimos abrir este PDF: puede estar dañado.",
    );
  }

  const paginas: PaginaConTexto[] = [];
  const sinTexto: number[] = [];
  for (let numero = 1; numero <= documento.numPages; numero += 1) {
    const pagina = await documento.getPage(numero);
    const { items } = await pagina.getTextContent();
    const trozos: TrozoDeTexto[] = items.flatMap((item) =>
      "str" in item
        ? [
            {
              texto: item.str,
              x: item.transform[4],
              y: item.transform[5],
              ancho: item.width,
              alto: item.height || Math.abs(item.transform[3]) || 10,
            },
          ]
        : [],
    );
    const renglones = renglonesDePagina(trozos);
    if (paginaTieneTexto(renglones)) paginas.push({ numero, texto: renglones.join("\n") });
    else sinTexto.push(numero);
    /* Las fotos de la página no hacen falta más: sin esto, un catálogo de cien
       páginas llena la memoria de un teléfono. */
    pagina.cleanup();
    alAvanzar(numero, documento.numPages);
  }
  return { documento, total: documento.numPages, paginas, sinTexto };
}

/* Una página sin texto, como imagen, para leerla como se lee una foto. */
export async function paginaComoImagen(documento: PDFDocumentProxy, numero: number): Promise<File> {
  const pagina = await documento.getPage(numero);
  const base = pagina.getViewport({ scale: 1 });
  /* Unos 1600 píxeles de ancho: lo que necesita un precio para leerse. */
  const vista = pagina.getViewport({ scale: Math.min(3, 1600 / base.width) });
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.ceil(vista.width);
  lienzo.height = Math.ceil(vista.height);
  await pagina.render({ canvas: lienzo, viewport: vista }).promise;
  pagina.cleanup();
  const imagen = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, "image/jpeg", 0.85));
  if (!imagen) throw new PdfIlegible("No pudimos preparar esa página.");
  return new File([imagen], `pagina-${numero}.jpg`, { type: "image/jpeg" });
}
