import { create } from "qrcode/lib/core/qrcode";

/* Un código QR como SVG, armado en el servidor.
 *
 * `lib/qr-con-logo.ts` dibuja en un lienzo y solo corre en el navegador. Para
 * una página que se arma en el servidor —la portada de MiPuesto— hace falta el
 * mismo código sin lienzo: un solo `path` con un cuadrado por módulo oscuro,
 * que pesa poco, se ve nítido a cualquier tamaño y toma el color de quien lo
 * contiene.
 *
 * El margen es de cuatro módulos, el que pide la norma: con menos, algunas
 * cámaras no encuentran el borde del código sobre un fondo que no sea blanco. */
const MARGEN = 4;

export function qrComoSvg(texto: string, titulo: string): string {
  const { modules } = create(texto, { errorCorrectionLevel: "M" });
  const lado = modules.size;
  let trazo = "";
  for (let fila = 0; fila < lado; fila += 1) {
    for (let columna = 0; columna < lado; columna += 1) {
      if (modules.get(fila, columna)) {
        trazo += `M${columna + MARGEN} ${fila + MARGEN}h1v1h-1z`;
      }
    }
  }
  const total = lado + MARGEN * 2;
  const tituloSeguro = titulo.replace(/[<>&"]/g, "");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" role="img" shape-rendering="crispEdges">` +
    `<title>${tituloSeguro}</title>` +
    `<rect width="${total}" height="${total}" fill="#ffffff"/>` +
    `<path d="${trazo}" fill="currentColor"/></svg>`
  );
}
