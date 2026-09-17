import type { PaletaId } from "./apariencia";

/* El color con el que se pinta la barra del navegador en el teléfono
 * (`<meta name="theme-color">`).
 *
 * Es un color por paleta, elegido a mano y no calculado, por una razón de
 * contraste: la barra del navegador dibuja sus íconos en blanco sobre este
 * color, así que tiene que ser oscuro en las siete. En las paletas claras es el
 * color de marca; en «noche», que ya es oscura, es su superficie —el mint de su
 * marca dejaría los íconos del navegador ilegibles—.
 *
 * Los valores salen de `tema-catalogo.module.css`. Si allá cambia un tono,
 * cambia acá: una prueba verifica que exista una entrada por cada paleta. */
export const COLOR_NAVEGADOR: Record<PaletaId, string> = {
  mercado: "#1f5b63",
  tierra: "#5a3722",
  /* Oscura desde que se la cambió: la barra va del color del fondo. */
  oceano: "#0f1720",
  /* El segundo azul de la paleta, que es el que pinta su cabecera. */
  noche: "#063852",
  altiplano: "#8a3a1e",
  jazmin: "#7a2b52",
  grafito: "#303539",
  selva: "#1f5132",
  cobre: "#8a4118",
  /* Oscura, como «noche»: la barra va del color del fondo y no del de marca.
     Una barra menta o durazno sobre un catálogo oscuro corta contra él. */
  pizarra: "#1d1714",
  rosal: "#a8325f",
  amapola: "#b3301f",
  /* Clara: la barra va de su color de marca, como el resto de las claras. */
  abeja: "#c9341f",
  /* Las de fondo negro: la barra va del negro del catálogo. Un dorado o un rojo
     vivo ahí dejaría los íconos del navegador ilegibles. */
  dorado: "#121110",
  rubi: "#131011",
  cielo: "#124a8c",
};

export function colorDeNavegador(paleta: string): string {
  return COLOR_NAVEGADOR[paleta as PaletaId] ?? COLOR_NAVEGADOR.mercado;
}
