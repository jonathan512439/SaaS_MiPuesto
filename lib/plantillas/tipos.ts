
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
  /* La tarjeta muestra una sola fotografía; la galería necesita todas. Se
     mandan aparte para no obligar a cada plantilla a recorrerlas cuando lo
     único que dibuja es la primera. */
  imagenes: Array<{ src: string; alt: string }>;
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
    id: string;
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

export type NavegacionCatalogo = {
  categorias: { id: string; nombre: string }[];
  activa: string;
  totalProductos: number;
  alElegir: (categoriaId: string) => void;
  busqueda: string;
  alBuscar: (termino: string) => void;
};

export type PropiedadesPlantilla = {
  datos: DatosPlantilla;
  paleta?: PaletaId;
  demostracion?: boolean;
  cantidadesCarrito?: Record<string, number>;
  alAgregarProducto?: (productoId: string) => void;
  alAbrirWhatsapp?: (productoId: string | null) => void;
  /* Sin este manejador la fotografía es estática. Así la vista previa del panel
     y la demostración de la portada no ofrecen una galería que ahí no lleva a
     ninguna parte. */
  alVerFotos?: (productoId: string) => void;
  /* Cuando el catalogo corre de verdad, la navegacion filtra y pagina, asi que
     no puede resolverse con anclas. Cada plantilla dibuja su propia barra con
     su estructura, pero conectada a este estado comun. Sin esta propiedad la
     plantilla esta en modo demostracion y su barra es inerte. */
  navegacion?: NavegacionCatalogo;
};
