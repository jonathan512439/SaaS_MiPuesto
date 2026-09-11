
import type { PaletaId, TarjetaId } from "../apariencia";
import type { Banner } from "../negocios/banners";
import type { EstadoAtencion } from "../horario";
import type { ModoAccionCatalogo } from "../modalidades";

export { PLANTILLAS } from "../apariencia";
export type { PaletaId, PlantillaId, TarjetaId } from "../apariencia";

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
  /* Los datos propios de su categoría, ya formateados y filtrados.
     `lineaAtributos` es lo que va en la tarjeta —«9 W · E27 · Cálida»— y
     `especificaciones` lo que va en la ficha, con su nombre al lado. Llegan
     resueltos para que ninguna plantilla tenga que conocer los tipos ni las
     unidades: eso vive en `lib/catalogo/valores.ts` y se dice una sola vez. */
  lineaAtributos: string | null;
  especificaciones: Array<{ clave: string; nombre: string; texto: string }>;
};

export type CategoriaPlantilla = {
  id: string;
  nombre: string;
  /* El dibujo de la categoría. Ya viene resuelto contra el juego generado, así
     que la plantilla lo dibuja sin comprobarlo. Las dos categorías que el
     sistema inventa —«Otros» y la carta del día— también traen el suyo: si
     fuera opcional, cada plantilla tendría que decidir qué poner cuando falta. */
  icono: string;
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
    /* Hasta dos, en orden: el primero va debajo de la portada y el segundo antes
       del pie. Vacío es lo normal, y es lo que ve un negocio recién dado de
       alta: el armazón no dibuja nada en su lugar. */
    banners: Banner[];
    /* Con qué forma se dibuja cada producto. Ya viene corregida: si el negocio
       tenía guardada una que su plantilla no dibuja, el servidor la cambió por
       la predeterminada antes de llegar acá. */
    tarjeta: TarjetaId;
    /* Vacío significa que el negocio no publicó su ubicación, no que no la
       tenga: el pie no dibuja nada en vez de mostrar un enlace roto. */
    ubicacionUrl: string | null;
    /* Solo donde se atiende en el local: pedirle la mesa a quien compra ropa
       por WhatsApp es un campo más entre él y el pedido. */
    pideNumeroMesa: boolean;
    /* Se ofrece recién después de pedir, que es cuando el cliente está contento
       y todavía tiene el teléfono en la mano. Vacío: no se muestra nada. */
    resenasUrl: string | null;
    /* Decide el patrón del fondo. Vacío: el patrón neutro. */
    rubro: string | null;
    /* El dueño puede apagar el fondo con dibujos. El panel lo lleva igual: la
       preferencia es sobre lo que ve el comprador, no sobre lo que ve él. */
    patronFondo: boolean;
  };
  categorias: CategoriaPlantilla[];
};

export type NavegacionCatalogo = {
  /* Cada una con su ícono: es lo que convierte la barra de categorías en las
     esferas del diseño nuevo. Llega ya normalizado —`categoriasParaNavegar` lo
     resolvió contra el juego generado—, así que la plantilla lo dibuja sin
     volver a comprobarlo. */
  categorias: { id: string; nombre: string; icono: string }[];
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
     y la demostración de la portada no ofrecen una ficha que ahí no lleva a
     ninguna parte. */
  alVerProducto?: (productoId: string) => void;
  /* Cuando el catalogo corre de verdad, la navegacion filtra y pagina, asi que
     no puede resolverse con anclas. Cada plantilla dibuja su propia barra con
     su estructura, pero conectada a este estado comun. Sin esta propiedad la
     plantilla esta en modo demostracion y su barra es inerte. */
  navegacion?: NavegacionCatalogo;
};
