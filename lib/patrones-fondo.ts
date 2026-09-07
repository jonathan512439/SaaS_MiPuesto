/* El patrón del fondo, elegido por rubro.
 *
 * Uno por rubro, y cada uno dibuja algo del oficio: el mantel del restaurante,
 * el papel milimetrado de la ferretería, el toldo de la tienda de la esquina.
 * Antes eran cuatro figuras geométricas repartidas entre siete rubros, y
 * ninguna decía nada del negocio.
 *
 * Son texturas y no íconos a propósito. Un tenedor o una llave inglesa a esta
 * opacidad y a este tamaño se convierten en manchas: lo que sobrevive al 6-8 %
 * es la trama, no el objeto.
 *
 * El nombre viaja como atributo `data-patron` y el dibujo vive en CSS: así el
 * color sale de la paleta del negocio y funciona igual en las siete, incluida
 * la oscura, donde la trama va más clara que el fondo en vez de más oscura.
 */
export type PatronFondo =
  | "comida"
  | "plano"
  | "toldo"
  | "sarga"
  | "escamas"
  | "renglones"
  | "rombos";

const POR_RUBRO: Record<string, PatronFondo> = {
  /* Objetos de cocina desparramados. */
  restaurante: "comida",
  /* Papel milimetrado, con línea fina y línea gruesa como un plano. */
  ferreteria: "plano",
  /* Las rayas del toldo de la tienda de la esquina. */
  tienda_barrio: "toldo",
  /* Sarga: la diagonal apretada del tejido de un pantalón. */
  ropa_y_calzado: "sarga",
  /* Escamas: el arco repetido que la peluquería comparte con el art déco. */
  belleza: "escamas",
  /* Renglones, como la agenda donde se anotan los turnos. */
  servicios: "renglones",
  /* Rombos: el único que no representa nada, así que se elige por vestido. */
  otro: "rombos",
};

export function patronDeRubro(rubro: string | null | undefined): PatronFondo {
  return POR_RUBRO[rubro ?? ""] ?? "rombos";
}
