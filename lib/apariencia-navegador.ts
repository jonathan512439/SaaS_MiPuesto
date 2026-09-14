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
  oceano: "#0f6178",
  noche: "#151a1c",
  altiplano: "#543279",
  jazmin: "#7a2b52",
  grafito: "#303539",
};

export function colorDeNavegador(paleta: string): string {
  return COLOR_NAVEGADOR[paleta as PaletaId] ?? COLOR_NAVEGADOR.mercado;
}
