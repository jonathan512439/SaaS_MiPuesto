/* El patrón del fondo, elegido por rubro.
 *
 * Cuatro dibujos y no siete: son tramas de fondo al 3 % de opacidad, y a esa
 * intensidad la diferencia entre siete variantes no se percibe. Lo que sí se
 * percibe es que una ferretería no tenga el mismo fondo que una barbería, y eso
 * se logra con cuatro.
 *
 * El nombre viaja como atributo `data-patron` y el dibujo vive en CSS: así el
 * color sale de la paleta del negocio y funciona igual en las siete, incluida
 * la oscura, donde la trama va más clara que el fondo en vez de más oscura.
 */
export type PatronFondo = "puntos" | "rejilla" | "diagonal" | "trama";

const POR_RUBRO: Record<string, PatronFondo> = {
  /* Puntitos, como el tramado de un mantel. */
  restaurante: "puntos",
  /* Cuadrícula técnica, como un plano o un papel milimetrado. */
  ferreteria: "rejilla",
  tienda_barrio: "rejilla",
  /* Diagonales finas, como un tejido. */
  ropa_y_calzado: "diagonal",
  belleza: "diagonal",
  /* Trama cruzada, sobria, para lo que no es ninguno de los anteriores. */
  servicios: "trama",
  otro: "trama",
};

export function patronDeRubro(rubro: string | null | undefined): PatronFondo {
  return POR_RUBRO[rubro ?? ""] ?? "trama";
}
