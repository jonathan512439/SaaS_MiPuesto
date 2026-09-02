import type { PaletaId } from "../apariencia";

export { PLANTILLAS } from "../apariencia";
export type { PaletaId, PlantillaId } from "../apariencia";

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
    horarioTexto: string;
  };
  categorias: CategoriaPlantilla[];
};

export type PropiedadesPlantilla = {
  datos: DatosPlantilla;
  paleta?: PaletaId;
};
