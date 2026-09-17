/* La apariencia de un catálogo: la paleta, y nada más.
 *
 * Hubo tres ejes —plantilla × tarjeta × paleta— pensados para dar doce
 * catálogos donde había cuatro. Al adoptar el diseño de `Catalogos_Ejemplo/` se
 * vio que el reparto estaba mal hecho: **lo que distingue a una veterinaria de
 * una ferretería no es la estructura de la página ni la forma de la tarjeta**,
 * son sus categorías, sus campos y sus acciones. Dos ejes multiplicaban
 * variantes de algo que no tenía por qué variar, y cada uno costaba mantener
 * cinco y seis archivos que hacían casi lo mismo.
 *
 * Queda un solo diseño de catálogo y un solo eje de apariencia: **el color**.
 * `PLANTILLAS`, `TARJETAS` y sus definiciones se podaron en la fase 6.
 */

export const PALETAS = [
  "mercado",
  "tierra",
  "oceano",
  "noche",
  "altiplano",
  "jazmin",
  "grafito",
  "selva",
  "cobre",
  "pizarra",
  "rosal",
  "amapola",
  "abeja",
  "dorado",
  "rubi",
  "cielo",
] as const;

export type PaletaId = (typeof PALETAS)[number];

export const DEFINICIONES_PALETAS: ReadonlyArray<{
  id: PaletaId;
  nombre: string;
  descripcion: string;
}> = [
  { id: "mercado", nombre: "Mercado", descripcion: "Verde profundo y naranja cálido." },
  { id: "tierra", nombre: "Tierra", descripcion: "Cacao profundo con acento de ladrillo." },
  { id: "oceano", nombre: "Océano", descripcion: "Azul de medianoche con acento latón." },
  { id: "noche", nombre: "Día y noche", descripcion: "Azul de medianoche con naranja y amarillo de amanecer." },
  { id: "altiplano", nombre: "Carta", descripcion: "Crema y madera con brasa, como una carta de restaurante." },
  { id: "jazmin", nombre: "Jazmín", descripcion: "Ciruela suave con acento dorado." },
  { id: "grafito", nombre: "Grafito", descripcion: "Gris carbón con acento rojo." },
  { id: "selva", nombre: "Selva", descripcion: "Verde bosque con acento ámbar." },
  { id: "cobre", nombre: "Cobre", descripcion: "Cobre cálido con acento petróleo." },
  { id: "pizarra", nombre: "Carta de noche", descripcion: "Madera oscura, crema y oro viejo." },
  { id: "rosal", nombre: "Rosal", descripcion: "Rosa profundo sobre azúcar, con caramelo. Para pastelerías." },
  { id: "amapola", nombre: "Amapola", descripcion: "Rojo de flor con ciruela. Para florerías." },
  { id: "abeja", nombre: "Sabor", descripcion: "Tomate y menta sobre crema. Para comida." },
  { id: "dorado", nombre: "Dorado", descripcion: "Negro con dorado y champán." },
  { id: "rubi", nombre: "Rubí", descripcion: "Negro con rojo encendido." },
  { id: "cielo", nombre: "Cielo", descripcion: "Blanco con azul marino y azul cielo." },
];
