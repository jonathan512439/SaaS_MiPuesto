export const PLANTILLAS = ["clasica", "moderna", "minimal"] as const;
export const PALETAS = ["mercado", "tierra", "oceano", "noche"] as const;

export type PlantillaId = (typeof PLANTILLAS)[number];
export type PaletaId = (typeof PALETAS)[number];

export const DEFINICIONES_PLANTILLAS: ReadonlyArray<{
  id: PlantillaId;
  nombre: string;
  enfoque: string;
  recomendacion: string;
}> = [
  {
    id: "clasica",
    nombre: "Clásica",
    enfoque: "Carta editorial",
    recomendacion: "Para restaurantes y negocios con categorías que conviene recorrer con calma.",
  },
  {
    id: "moderna",
    nombre: "Moderna",
    enfoque: "Vitrina visual",
    recomendacion: "Para tiendas donde las fotografías y las acciones rápidas ayudan a decidir.",
  },
  {
    id: "minimal",
    nombre: "Mínima",
    enfoque: "Servicios y contacto",
    recomendacion: "Para profesionales, reservas y negocios que priorizan atención directa.",
  },
];

export const DEFINICIONES_PALETAS: ReadonlyArray<{
  id: PaletaId;
  nombre: string;
  descripcion: string;
}> = [
  { id: "mercado", nombre: "Mercado", descripcion: "Verde profundo y naranja cálido." },
  { id: "tierra", nombre: "Tierra", descripcion: "Cacao profundo con acento de ladrillo." },
  { id: "oceano", nombre: "Océano", descripcion: "Azules frescos con acento frambuesa." },
  { id: "noche", nombre: "Noche", descripcion: "Fondo oscuro con acentos claros y elegantes." },
];

export const COMBINACIONES_APARIENCIA = PLANTILLAS.flatMap((plantilla) =>
  PALETAS.map((paleta) => ({ plantilla, paleta })),
);
