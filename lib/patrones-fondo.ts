/* El patrón del fondo, elegido por rubro.
 *
 * Uno por rubro, y cada uno desparrama los objetos del oficio, como el fondo de
 * WhatsApp. Los dibujos viven en `public/patrones/` y los arma
 * `scripts/armar-patrones.mjs` con íconos de Lucide (ISC).
 *
 * El nombre viaja como atributo `data-patron` y la baldosa se aplica como
 * máscara desde CSS: así el color sale de la paleta del negocio y funciona en
 * las siete, incluida la oscura, donde el dibujo va más claro que el fondo.
 */
export type PatronFondo =
  | "comida"
  | "herramientas"
  | "abarrotes"
  | "vestuario"
  | "cuidado"
  | "turnos"
  | "comercio";

const POR_RUBRO: Record<string, PatronFondo> = {
  restaurante: "comida",
  ferreteria: "herramientas",
  tienda_barrio: "abarrotes",
  ropa_y_calzado: "vestuario",
  belleza: "cuidado",
  servicios: "turnos",
  /* Sin oficio que dibujar, se dibuja lo unico que todos comparten: la venta. */
  otro: "comercio",
};

export function patronDeRubro(rubro: string | null | undefined): PatronFondo {
  return POR_RUBRO[rubro ?? ""] ?? "comercio";
}
