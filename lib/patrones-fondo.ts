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

/* Cuánto se nota el patrón, en por ciento.
 *
 * De 0 a 30: arriba de 30 el dibujo compite con el texto y el catálogo se vuelve
 * incómodo de leer. El techo también está en la base, para que no dependa de qué
 * pantalla escribió el número.
 *
 * Va de tres en tres y no de uno en uno por dos razones. Entre 11 y 12 por
 * ciento no hay diferencia que un ojo distinga, así que treinta y un valores
 * serían treinta y un nombres para once cosas. Y cada valor posible es **una
 * regla de CSS**: el número no puede viajar como estilo en línea —la guarda de
 * tokens lo prohíbe, y con razón, porque un estilo en línea es la puerta por la
 * que entra un color fuera del sistema—, así que viaja como atributo y la hoja
 * tiene un paso por regla. Once pasos dan control fino y once reglas legibles.
 */
export const PASOS_OPACIDAD_PATRON = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30] as const;

/* Lo que ya se veía antes de que esto fuera elegible. Un negocio anterior a la
   columna tiene que seguir viéndose igual: la fase no le cambia el catálogo a
   nadie por haber corrido una migración. */
export const OPACIDAD_PATRON_PREDETERMINADA = 6;

export function acotarOpacidad(valor: unknown): number {
  const numero =
    typeof valor === "number" && Number.isFinite(valor)
      ? valor
      : OPACIDAD_PATRON_PREDETERMINADA;
  const dentroDelRango = Math.min(30, Math.max(0, numero));
  /* Al paso más cercano: la base admite cualquier entero de 0 a 30 —un script o
     una restauración pueden dejar un 11— y el catálogo dibuja los once pasos. */
  return PASOS_OPACIDAD_PATRON.reduce((mejor, paso) =>
    Math.abs(paso - dentroDelRango) < Math.abs(mejor - dentroDelRango) ? paso : mejor,
  );
}

/* Los íconos con los que se arma el fondo del negocio.
 *
 * Se decide en una función y no en cada pantalla porque **la decisión se toma en
 * tres lugares**: el catálogo público y la vista previa del panel tienen que
 * saber si poner el dibujo por rubro —el de reserva— y la plantilla tiene que
 * saber si dibujar el propio. Si cada uno lo resolviera a su manera, un día
 * pondrían los dos a la vez y el fondo saldría doble.
 *
 * Sin repetidos: dos categorías con el mismo ícono no tienen por qué ocupar dos
 * de las ocho posiciones de la baldosa. El tope es ese, ocho, que es lo que la
 * baldosa dibuja; pedir más sería trabajo que no se ve. */
export const MAXIMO_ICONOS_PATRON = 8;

export function iconosDePatron(
  categorias: ReadonlyArray<{ icono?: string | null }>,
): string[] {
  const vistos: string[] = [];
  for (const { icono } of categorias) {
    const nombre = typeof icono === "string" ? icono.trim() : "";
    if (nombre === "" || vistos.includes(nombre)) continue;
    vistos.push(nombre);
    if (vistos.length >= MAXIMO_ICONOS_PATRON) break;
  }
  return vistos;
}
