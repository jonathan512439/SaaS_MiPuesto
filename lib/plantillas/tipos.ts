import type { ReactNode } from "react";


import type { FormaTarjeta, PaletaId } from "../apariencia";
import type { Banner } from "../negocios/banners";
import type { TextoSobreImagen } from "../negocios/texto-sobre-imagen";
import type { EstadoAtencion } from "../horario";
import type { ModoAccionCatalogo } from "../modalidades";

export type { PaletaId } from "../apariencia";

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
  /* Las presentaciones: talla, color, tamaño. `precio` ya viene resuelto —el
     propio, o el del producto si no tiene— para que ninguna pantalla tenga que
     acordarse de esa regla. Vacío es lo normal: la mayoría de los productos se
     venden de una sola forma. */
  /* Si su categoría vende tiempo. Decide que la ficha dibuje el calendario en
     vez del selector de cantidad: son dos formas de comprar distintas y ninguna
     pantalla tiene que decidirlo mirando otra cosa. */
  vendeTiempo: boolean;
  /* Qué son sus presentaciones: decide cómo se pregunta («Elige tu número») y
     cómo se nombra la elegida («N.º 40,5»). Opcional para los datos de muestra,
     que no la necesitan; sin ella es «una opción». */
  tipoPresentacion?: "talla" | "numero" | "tamano" | "presentacion";
  /* Solo en un renglón del carrito que es una presentación: qué producto y qué
     presentación se piden. El renglón tiene su propio `id` —producto y
     presentación juntos— para que la M y la L sean dos renglones. */
  seleccion?: { productoId: string; varianteId: string };
  variantes: Array<{
    id: string;
    nombre: string;
    precio: number;
    /* Cuántas quedan para pedir, o `null` si el producto no lleva la cuenta. */
    disponibles?: number | null;
    /* Su propio enlace, armado en el servidor con su nombre y su precio. Se
       manda resuelto en vez de rearmar el mensaje en el navegador: el texto lo
       escribe `construirMensajeProducto` y tenerlo en dos lugares haría que un
       día digan cosas distintas. */
    accionWhatsapp: string | null;
  }>;
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
    /* Lo que va escrito sobre la portada: antetítulo, título, bajada y botón,
       todo opcional. Sin nada, la portada es la foto sola, sin cortina. Nunca
       nulo: «sin texto» es un valor, y quien dibuja pregunta `tieneAlgoEncima`. */
    portadaTexto: TextoSobreImagen;
    /* Cómo se dibujan los productos. Viaja con el negocio y no como una prop
       aparte, como la paleta, porque la vista previa del panel arma un negocio
       de demostración y lo tiene que llevar adentro. */
    formaTarjeta: FormaTarjeta;
    qrPagoUrl: string | null;
    redesSociales: Array<{ nombre: string; url: string }>;
    /* El banner de publicidad, entre dos categorías. Un solo lugar, y `null`
       es «vacío», que es lo normal y lo que ve un negocio recién dado de alta:
       el armazón no dibuja nada en su lugar. */
    banners: Array<Banner | null>;
    /* Vacío significa que el negocio no publicó su ubicación, no que no la
       tenga: el pie no dibuja nada en vez de mostrar un enlace roto. */
    ubicacionUrl: string | null;
    /* Solo donde se atiende en el local: pedirle la mesa a quien compra ropa
       por WhatsApp es un campo más entre él y el pedido. */
    pideNumeroMesa: boolean;
    /* El máximo de unidades por pedido que puso el dueño. `null`: sin tope
       propio, que es lo normal. El carrito avisa antes de enviar; quien decide
       es `crear_pedido_reservado`. */
    topeUnidadesPedido: number | null;
    /* Se ofrece recién después de pedir, que es cuando el cliente está contento
       y todavía tiene el teléfono en la mano. Vacío: no se muestra nada. */
    resenasUrl: string | null;
    /* Decide el patrón del fondo. Vacío: el patrón neutro. */
    rubro: string | null;
    /* El dueño puede apagar el fondo con dibujos. El panel lo lleva igual: la
       preferencia es sobre lo que ve el comprador, no sobre lo que ve él. */
    patronFondo: boolean;
    /* Cuánto se nota ese fondo, en por ciento. Llega ya acotado a uno de los
       pasos que la hoja sabe dibujar, así que la plantilla lo pone tal cual. */
    patronOpacidad: number;
    /* El renglón corto bajo el nombre, en la cabecera. Vacío es lo normal: es
       distinto de `descripcion`, que es el párrafo del negocio. */
    subnombre: string | null;
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
  /* Lo que se dibuja pegado al final de los productos y antes del pie.
     Hoy es el paginador y el aviso de «no encontramos eso». Llega desde afuera
     porque quien sabe cuántas páginas hay es el catálogo interactivo, no la
     plantilla, y entra como nodo y no como datos porque son enlaces con estado
     de navegación: la plantilla no tiene por qué saber cómo se arma una
     dirección de página. */
  antesDelPie?: ReactNode;
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
