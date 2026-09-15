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
] as const;

export type PaletaId = (typeof PALETAS)[number];

export const DEFINICIONES_PALETAS: ReadonlyArray<{
  id: PaletaId;
  nombre: string;
  descripcion: string;
}> = [
  { id: "mercado", nombre: "Mercado", descripcion: "Verde profundo y naranja cálido." },
  { id: "tierra", nombre: "Tierra", descripcion: "Cacao profundo con acento de ladrillo." },
  { id: "oceano", nombre: "Océano", descripcion: "Azules frescos con acento frambuesa." },
  { id: "noche", nombre: "Noche", descripcion: "Fondo oscuro con acentos claros y elegantes." },
  { id: "altiplano", nombre: "Altiplano", descripcion: "Violeta andino con acento carmín." },
  { id: "jazmin", nombre: "Jazmín", descripcion: "Ciruela suave con acento dorado." },
  { id: "grafito", nombre: "Grafito", descripcion: "Gris carbón con acento rojo." },
  { id: "selva", nombre: "Selva", descripcion: "Verde bosque con acento ámbar." },
  { id: "cobre", nombre: "Cobre", descripcion: "Cobre cálido con acento petróleo." },
  { id: "pizarra", nombre: "Pizarra", descripcion: "Fondo oscuro frío con acento durazno." },
];
