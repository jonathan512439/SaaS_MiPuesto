// Fuente reutilizable por formatos que no pueden resolver variables CSS, como el manifest,
// el PNG de Open Graph y el generador de QR. Debe mantenerse sincronizada con globals.css.
export const COLORES_MIPUESTO = {
  marca: "#1f5b63",
  superficie: "#fbfaf8",
  texto: "#15292c",
  /* La marca sobre la marca, para el toldo de fondo de la imagen de vista
     previa. Es `marca` mezclada un 45 % hacia `superficie`, calculada y escrita
     acá porque ese formato no resuelve `color-mix` ni variables CSS. Tampoco se
     puede lograr con opacidad: el generador de esa imagen ignora
     `stroke-opacity`, y se comprobó mirando el PNG que salía blanco puro. */
  marcaAgua: "#84a5a9",
} as const;
