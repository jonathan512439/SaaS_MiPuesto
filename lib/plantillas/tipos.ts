export const PLANTILLAS = ["clasica", "moderna", "minimal"] as const;

export type PlantillaId = (typeof PLANTILLAS)[number];

export type ProductoPlantilla = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: {
    src: string;
    alt: string;
  };
};

export type CategoriaPlantilla = {
  id: string;
  nombre: string;
  productos: ProductoPlantilla[];
};

export type DatosPlantilla = {
  negocio: {
    nombre: string;
    descripcion: string;
    telefonoWhatsapp: string;
  };
  categorias: CategoriaPlantilla[];
};

export type PropiedadesPlantilla = {
  datos: DatosPlantilla;
};
