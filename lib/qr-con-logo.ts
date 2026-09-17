import { svgDeIsotipo } from "./marca/isotipo";

/* El QR del catálogo, con el isotipo de MiPuesto detrás.
 *
 * **La marca va debajo y no encima, y ese es todo el asunto.** Un logo puesto
 * sobre el centro tapa módulos: funciona porque el formato sabe reconstruir lo
 * que le falta, pero funciona *a pesar* del logo, y cuanto más grande se lo
 * quiere, más cerca queda del borde en que deja de leerse.
 *
 * Detrás no tapa nada. El truco es generar el código **con el fondo
 * transparente**, de modo que la imagen traiga solo los módulos oscuros, y
 * pintar debajo: primero el papel, después la marca de agua, y encima el código.
 * Los módulos oscuros quedan igual de oscuros y los claros quedan con un velo
 * gris clarísimo. Un lector decide entre claro y oscuro comparando, y esa
 * diferencia no se toca.
 *
 * Por eso la marca de agua **puede ser grande** —ocupa más de la mitad del
 * código— sin que eso cueste nada en fiabilidad, que es justo lo contrario de lo
 * que pasaba con el logo encima.
 *
 * Se conserva la corrección alta igual. No hace falta para esto, pero da margen
 * para lo que no se puede controlar desde acá: una impresión pálida, una
 * fotocopia, un plástico rayado sobre el mostrador.
 */

/* Cuánto del lado ocupa la marca de agua. Grande a propósito: si va a ser un
   velo, tiene que leerse como una figura y no como una mancha. */
export const PARTE_DEL_LADO = 0.62;

/* Qué tan tenue. Es el único número que puede romper algo acá: subirlo acerca
   el gris del velo al negro de los módulos. A 0,12 el velo queda en un gris muy
   claro, lejísimos del umbral con el que un lector separa claro de oscuro. */
export const VELO = 0.12;

export type OpcionesQr = {
  texto: string;
  lado: number;
  colorOscuro: string;
  colorClaro: string;
};

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const imagen = new Image();
    imagen.onload = () => resolver(imagen);
    imagen.onerror = () => rechazar(new Error("no se pudo cargar la imagen"));
    imagen.src = url;
  });
}

export async function dibujarQrConLogo({
  texto,
  lado,
  colorOscuro,
  colorClaro,
}: OpcionesQr): Promise<string> {
  const { toDataURL } = await import("qrcode");

  const qr = await toDataURL(texto, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: lado,
    color: {
      dark: colorOscuro,
      /* Transparente: la imagen trae solo los módulos oscuros. Sin esto, el
         fondo blanco del código taparía la marca de agua y no se vería nada. */
      light: "#00000000",
    },
  });

  try {
    const svg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgDeIsotipo(colorOscuro))}`;
    const [codigo, marca] = await Promise.all([cargarImagen(qr), cargarImagen(svg)]);

    const lienzo = document.createElement("canvas");
    lienzo.width = lado;
    lienzo.height = lado;
    const pincel = lienzo.getContext("2d");
    if (!pincel) return qr;

    /* 1. El papel. Va pintado y no se deja transparente: un PNG con fondo
          transparente impreso o pegado en un chat se ve sobre lo que haya
          detrás, y ahí sí se pierde el contraste. */
    pincel.fillStyle = colorClaro;
    pincel.fillRect(0, 0, lado, lado);

    /* 2. La marca de agua, centrada y tenue. El isotipo es más alto que ancho
          —256 por 325—, así que se escala por el alto para que entre entero. */
    const alto = Math.round(lado * PARTE_DEL_LADO);
    const ancho = Math.round((alto * 256) / 325);
    pincel.globalAlpha = VELO;
    pincel.drawImage(marca, Math.round((lado - ancho) / 2), Math.round((lado - alto) / 2), ancho, alto);
    pincel.globalAlpha = 1;

    /* 3. El código, encima y sin tocar. */
    pincel.drawImage(codigo, 0, 0, lado, lado);

    return lienzo.toDataURL("image/png");
  } catch {
    /* Si algo falló, el código sin marca de agua sirve igual —y es lo que el
       dueño necesita ahora—. Pero hay que devolverlo con su fondo: el que se
       generó arriba lo tiene transparente. */
    return toDataURL(texto, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: lado,
      color: { dark: colorOscuro, light: colorClaro },
    });
  }
}
