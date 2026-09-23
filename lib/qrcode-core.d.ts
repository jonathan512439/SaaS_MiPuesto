/* El núcleo de `qrcode`, sin la parte que dibuja en PNG o en un lienzo.
 *
 * El paquete trae tipos solo para su entrada principal, que en el servidor
 * arrastra `pngjs` y `fs`. El núcleo es JavaScript puro y es todo lo que hace
 * falta para saber qué módulos van oscuros; esto le pone los tipos que usa
 * `lib/qr-svg.ts` y nada más. */
declare module "qrcode/lib/core/qrcode" {
  export function create(
    texto: string,
    opciones?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" },
  ): { modules: { size: number; get(fila: number, columna: number): number | boolean } };
}
