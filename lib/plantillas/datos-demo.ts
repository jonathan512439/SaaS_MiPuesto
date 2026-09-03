import type { DatosPlantilla } from "./tipos";
import { evaluarHorario } from "../horario";
import { obtenerComportamientoModalidad } from "../modalidades";
import type { TipoNegocio } from "../negocios/validacion";

type DatosNegocioDemo = {
  nombre: string;
  descripcion: string | null;
  telefonoWhatsapp: string;
  tipoNegocio?: TipoNegocio;
};

export function crearDatosDemoPlantilla({
  nombre,
  descripcion,
  telefonoWhatsapp,
  tipoNegocio = "tienda_virtual",
}: DatosNegocioDemo): DatosPlantilla {
  const modalidad = obtenerComportamientoModalidad(tipoNegocio);
  return {
    negocio: {
      slug: "negocio-demostracion",
      nombre,
      descripcion:
        descripcion?.trim() ||
        "Productos y servicios preparados para atenderte con la cercanía de siempre.",
      telefonoWhatsapp,
      modalidad: modalidad.accion,
      descripcionModalidad: modalidad.descripcion,
      atencion: evaluarHorario({ modo: "siempre_abierto", dias: {} }),
      qrPagoUrl: null,
    },
    categorias: [
      {
        id: "demo-destacados",
        nombre: "Más pedidos",
        productos: [
          {
            id: "demo-1",
            codigo: "PRD-DEMO01",
            nombre: "Hamburguesa de la casa",
            descripcion: "Doble carne, queso, vegetales frescos y nuestra salsa especial.",
            precio: 45,
            accionWhatsapp: null,
            maximoCantidad: 99,
            controlaStock: true,
            cantidadDisponible: 8,
            imagen: {
              src: "/demo/productos/hamburguesa.webp",
              alt: "Hamburguesa doble con queso y vegetales frescos",
            },
          },
          {
            id: "demo-2",
            codigo: "PRD-DEMO02",
            nombre: "Papas con salsa",
            descripcion: "Papas rústicas doradas acompañadas con salsa de la casa.",
            precio: 32,
            accionWhatsapp: null,
            maximoCantidad: 99,
            controlaStock: true,
            cantidadDisponible: 14,
            imagen: {
              src: "/demo/productos/papas.webp",
              alt: "Porción de papas rústicas doradas con salsa",
            },
          },
        ],
      },
      {
        id: "demo-bebidas",
        nombre: "Bebidas",
        productos: [
          {
            id: "demo-3",
            codigo: "PRD-DEMO03",
            nombre: "Limonada artesanal",
            descripcion: "Preparada al momento con limón, hielo y hojas de menta.",
            precio: 18,
            accionWhatsapp: null,
            maximoCantidad: 99,
            controlaStock: true,
            cantidadDisponible: 6,
            imagen: {
              src: "/demo/productos/limonada.webp",
              alt: "Vaso de limonada fría con limón y menta",
            },
          },
        ],
      },
    ],
  };
}
