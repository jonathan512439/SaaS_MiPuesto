import type { ReactNode } from "react";

import type { PaletaId } from "../apariencia";
import type { EstadoAtencion } from "../horario";
import type { ModoAccionCatalogo } from "../modalidades";

export { PLANTILLAS } from "../apariencia";
export type { PaletaId, PlantillaId } from "../apariencia";

export type ProductoPlantilla = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  precio: number;
  precioOriginal: number;
  tienePromocion: boolean;
  imagen: {
    src: string;
    alt: string;
  } | null;
  estado?: string;
  controlaStock: boolean;
  cantidadDisponible: number | null;
  maximoCantidad: number;
  accionWhatsapp: string | null;
};

export type CategoriaPlantilla = {
  id: string;
  nombre: string;
  productos: ProductoPlantilla[];
  subcategorias?: Array<{
    id: string;
    nombre: string;
    productos: ProductoPlantilla[];
  }>;
};

export type DatosPlantilla = {
  negocio: {
    slug: string;
    nombre: string;
    descripcion: string;
    telefonoWhatsapp: string;
    modalidad: ModoAccionCatalogo;
    descripcionModalidad: string;
    atencion: EstadoAtencion;
    logoUrl: string | null;
    portadaUrl: string | null;
    qrPagoUrl: string | null;
    redesSociales: Array<{ nombre: string; url: string }>;
  };
  categorias: CategoriaPlantilla[];
};

export type PropiedadesPlantilla = {
  datos: DatosPlantilla;
  paleta?: PaletaId;
  demostracion?: boolean;
  cantidadesCarrito?: Record<string, number>;
  alAgregarProducto?: (productoId: string) => void;
  ocultarNavegacionCategorias?: boolean;
  navegacionCatalogo?: ReactNode;
};
