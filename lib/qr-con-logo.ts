/* Un QR con el logo del negocio en el medio, sin que deje de escanearse.
 *
 * Tapar el centro de un QR no lo rompe **porque el formato está preparado para
 * que le falte información**: cada código lleva datos de corrección de errores
 * que permiten reconstruir lo que no se lee. Lo que decide si sigue funcionando
 * es cuánto se tapa y con qué nivel de corrección se generó.
 *
 * Por eso esto hace tres cosas y no una:
 *
 * 1. **Sube la corrección a «H»**, que recupera hasta un 30 % del código. El QR
 *    del catálogo estaba en «M» —15 %—, que alcanza para un código limpio y no
 *    para uno con algo encima.
 * 2. **Tapa el 18 % del lado**, o sea algo más del 3 % de la superficie. Muy por
 *    debajo del 30 %, y a propósito: ese 30 % es el techo teórico con el código
 *    perfectamente impreso y perfectamente enfocado, y un QR se escanea en un
 *    mostrador, con luz de tubo, desde un teléfono que tiembla. El margen que
 *    sobra es lo que hace que funcione en ese mostrador y no solo en la pantalla.
 * 3. **Pone el logo sobre un recuadro claro** con su propio borde. Sin él, un
 *    logo oscuro se confunde con los módulos negros que lo rodean y el lector no
 *    encuentra dónde termina el código; con él, la zona tapada queda delimitada
 *    y es justo lo que la corrección de errores sabe reconstruir.
 *
 * **Si el logo no se puede cargar, se devuelve el QR sin logo.** Un QR sin logo
 * es un QR; un QR a medio dibujar no es nada. El caso real es el logo que tarda,
 * o el que quedó con una dirección que ya no existe.
 */

/* Cuánto del lado del QR ocupa el logo. No se sube sin volver a escanear el
   resultado en un teléfono de verdad: el número que importa no es el de la
   especificación sino el que funciona en el mostrador. */
const PARTE_DEL_LADO = 0.18;

export type OpcionesQr = {
  texto: string;
  lado: number;
  colorOscuro: string;
  colorClaro: string;
  logoUrl?: string | null;
};

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const imagen = new Image();
    /* Sin esto el lienzo queda «manchado» y el navegador prohíbe exportarlo: el
       QR se dibujaría bien en pantalla y fallaría al convertirlo en imagen, que
       es el único momento en que sirve. */
    imagen.crossOrigin = "anonymous";
    imagen.onload = () => resolver(imagen);
    imagen.onerror = () => rechazar(new Error("no se pudo cargar el logo"));
    imagen.src = url;
  });
}

export async function dibujarQrConLogo({
  texto,
  lado,
  colorOscuro,
  colorClaro,
  logoUrl,
}: OpcionesQr): Promise<string> {
  const { toDataURL } = await import("qrcode");

  const qr = await toDataURL(texto, {
    /* «H» y no «M»: es lo que deja sitio para el logo. Se usa aunque no haya
       logo, para que el código impreso sea el mismo con logo y sin él —un
       negocio que sube su logo después no tiene que reimprimir nada. */
    errorCorrectionLevel: "H",
    margin: 2,
    width: lado,
    color: { dark: colorOscuro, light: colorClaro },
  });

  if (!logoUrl) return qr;

  try {
    const [base, logo] = await Promise.all([cargarImagen(qr), cargarImagen(logoUrl)]);

    const lienzo = document.createElement("canvas");
    lienzo.width = lado;
    lienzo.height = lado;
    const pincel = lienzo.getContext("2d");
    if (!pincel) return qr;

    pincel.drawImage(base, 0, 0, lado, lado);

    const ladoLogo = Math.round(lado * PARTE_DEL_LADO);
    /* El recuadro claro es un poco más grande que el logo: ese aire es lo que
       separa el logo de los módulos y lo que hace que el lector vea un hueco
       limpio en vez de un dibujo pegado al código. */
    const ladoPad = Math.round(ladoLogo * 1.28);
    const desde = Math.round((lado - ladoPad) / 2);

    pincel.fillStyle = colorClaro;
    pincel.beginPath();
    pincel.roundRect(desde, desde, ladoPad, ladoPad, Math.round(ladoPad * 0.18));
    pincel.fill();

    const desdeLogo = Math.round((lado - ladoLogo) / 2);
    pincel.drawImage(logo, desdeLogo, desdeLogo, ladoLogo, ladoLogo);

    return lienzo.toDataURL("image/png");
  } catch {
    /* El logo no pudo entrar. El QR que ya está hecho sirve igual, y es lo que
       el dueño necesita ahora mismo. */
    return qr;
  }
}
