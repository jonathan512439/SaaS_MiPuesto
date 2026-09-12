import type { DatosPlantilla } from "./tipos";
import { evaluarHorario } from "../horario";
import { obtenerComportamientoModalidad } from "../modalidades";
import type { TipoNegocio } from "../negocios/validacion";

type DatosNegocioDemo = {
  nombre: string;
  descripcion: string | null;
  telefonoWhatsapp: string;
  tipoNegocio?: TipoNegocio;
  /* La vista previa tiene que traer el rubro y la preferencia reales del
     negocio: si no, muestra un fondo que no es el que va a quedar. */
  rubro?: string | null;
  patronFondo?: boolean;
};

export function crearDatosDemoPlantilla({
  nombre,
  descripcion,
  telefonoWhatsapp,
  tipoNegocio = "tienda_virtual",
  rubro = null,
  patronFondo = true,
}: DatosNegocioDemo): DatosPlantilla {
  const modalidad = obtenerComportamientoModalidad(tipoNegocio);
  return {
    negocio: {
      id: "",
      slug: "negocio-demostracion",
      nombre,
      descripcion:
        descripcion?.trim() ||
        "Productos y servicios preparados para atenderte con la cercanía de siempre.",
      telefonoWhatsapp,
      modalidad: modalidad.accion,
      descripcionModalidad: modalidad.descripcion,
      atencion: evaluarHorario({ modo: "siempre_abierto", dias: {} }),
      logoUrl: null,
      portadaUrl: null,
      qrPagoUrl: null,
      ubicacionUrl: null,
    pideNumeroMesa: false,
    resenasUrl: null,
    rubro,
    patronFondo,
    redesSociales: [],
    banners: [],
    tarjeta: "cuadricula" as const,
    },
    categorias: [
      {
        id: "demo-destacados",
        nombre: "Más pedidos",
        icono: "estrella",
        productos: [
          {
            id: "demo-1",
            lineaAtributos: null,
            variantes: [],
            vendeTiempo: false,
            proximoTurno: null,
            especificaciones: [],
            codigo: "PRD-DEMO01",
            nombre: "Hamburguesa de la casa",
            descripcion: "Doble carne, queso, vegetales frescos y nuestra salsa especial.",
            precio: 45,
            precioOriginal: 45,
            tienePromocion: false,
            accionWhatsapp: null,
            maximoCantidad: 99,
            controlaStock: true,
            cantidadDisponible: 8,
            imagen: {
              src: "/demo/productos/hamburguesa.webp",
              alt: "Hamburguesa doble con queso y vegetales frescos",
            },
            imagenes: [{ src: "/demo/productos/hamburguesa.webp", alt: "Hamburguesa doble con queso y vegetales frescos" }],
          },
          {
            id: "demo-2",
            lineaAtributos: null,
            variantes: [],
            vendeTiempo: false,
            proximoTurno: null,
            especificaciones: [],
            codigo: "PRD-DEMO02",
            nombre: "Papas con salsa",
            descripcion: "Papas rústicas doradas acompañadas con salsa de la casa.",
            precio: 32,
            precioOriginal: 32,
            tienePromocion: false,
            accionWhatsapp: null,
            maximoCantidad: 99,
            controlaStock: true,
            cantidadDisponible: 14,
            imagen: {
              src: "/demo/productos/papas.webp",
              alt: "Porción de papas rústicas doradas con salsa",
            },
            imagenes: [{ src: "/demo/productos/papas.webp", alt: "Porción de papas rústicas doradas con salsa" }],
          },
        ],
      },
      {
        id: "demo-bebidas",
        nombre: "Bebidas",
        icono: "vaso",
        productos: [
          {
            id: "demo-3",
            lineaAtributos: null,
            variantes: [],
            vendeTiempo: false,
            proximoTurno: null,
            especificaciones: [],
            codigo: "PRD-DEMO03",
            nombre: "Limonada artesanal",
            descripcion: "Preparada al momento con limón, hielo y hojas de menta.",
            precio: 18,
            precioOriginal: 18,
            tienePromocion: false,
            accionWhatsapp: null,
            maximoCantidad: 99,
            controlaStock: true,
            cantidadDisponible: 6,
            imagen: {
              src: "/demo/productos/limonada.webp",
              alt: "Vaso de limonada fría con limón y menta",
            },
            imagenes: [{ src: "/demo/productos/limonada.webp", alt: "Vaso de limonada fría con limón y menta" }],
          },
        ],
      },
    ],
  };
}
