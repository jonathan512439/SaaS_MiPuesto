import type { PaletaId, PlantillaId } from "../apariencia";
import { evaluarHorario } from "../horario";
import { obtenerComportamientoModalidad } from "../modalidades";
import type { DatosPlantilla, ProductoPlantilla } from "./tipos";

/* La portada mostraba «cuatro estructuras y siete colores», que es una frase de
 * producto. Un comerciante no se reconoce ahí; se reconoce en «así se ve una
 * ferretería», con tornillos y medidas.
 *
 * Solo el restaurante lleva fotografías, porque son las únicas que existen de
 * verdad y no se van a inventar las demás. Tampoco hace falta: los rubros sin
 * foto usan las plantillas donde la foto es lo de menos —la lista de precios y
 * el listado de servicios—, y de paso muestran cómo se ve un catálogo el primer
 * día, antes de cargar imágenes.
 */
export type DemoRubro = {
  id: string;
  rubro: string;
  gancho: string;
  plantilla: PlantillaId;
  paleta: PaletaId;
  datos: DatosPlantilla;
};

type ProductoDemo = {
  nombre: string;
  descripcion: string;
  precio: number;
  disponibles?: number | null;
  imagen?: { src: string; alt: string };
  /* Los datos propios del rubro, ya escritos como se ven. La demostración es
     para que el dueño reconozca su negocio, y una ferretería sin «9 W · E27» no
     se parece a una ferretería. */
  datosPropios?: Array<{ nombre: string; texto: string }>;
};

function producto(indice: number, datos: ProductoDemo): ProductoPlantilla {
  const imagenes = datos.imagen ? [datos.imagen] : [];
  return {
    id: `demo-${indice}`,
    codigo: `PRD-DEMO${String(indice).padStart(2, "0")}`,
    variantes: [],
    vendeTiempo: false,
    lineaAtributos:
      datos.datosPropios && datos.datosPropios.length > 0
        ? datos.datosPropios.map(({ texto }) => texto).join(" · ")
        : null,
    especificaciones: (datos.datosPropios ?? []).map((dato, posicion) => ({
      clave: `demo-${posicion}`,
      ...dato,
    })),
    nombre: datos.nombre,
    descripcion: datos.descripcion,
    precio: datos.precio,
    precioOriginal: datos.precio,
    tienePromocion: false,
    accionWhatsapp: null,
    maximoCantidad: 99,
    controlaStock: datos.disponibles !== undefined && datos.disponibles !== null,
    cantidadDisponible: datos.disponibles ?? null,
    imagen: datos.imagen ?? null,
    imagenes,
  };
}

function negocio(
  nombre: string,
  descripcion: string,
  tipoNegocio: "tienda_virtual" | "catalogo_cta" | "catalogo_estatico",
): DatosPlantilla["negocio"] {
  const modalidad = obtenerComportamientoModalidad(tipoNegocio);
  return {
    id: "",
    slug: "negocio-demostracion",
    nombre,
    descripcion,
    telefonoWhatsapp: "70000000",
    modalidad: modalidad.accion,
    descripcionModalidad: modalidad.descripcion,
    atencion: evaluarHorario({ modo: "siempre_abierto", dias: {} }),
    logoUrl: null,
    portadaUrl: null,
    qrPagoUrl: null,
    ubicacionUrl: null,
    pideNumeroMesa: false,
    resenasUrl: null,
    rubro: null,
    patronFondo: true,
    patronOpacidad: 6,
    subnombre: null,
    redesSociales: [],
    banners: [],
    tarjeta: "cuadricula" as const,
  };
}

export const DEMOS_POR_RUBRO: DemoRubro[] = [
  {
    id: "restaurante",
    rubro: "Restaurante",
    gancho: "Carta por categorías y pedidos con carrito.",
    plantilla: "clasica",
    paleta: "tierra",
    datos: {
      negocio: negocio(
        "Sabor Camba",
        "Cocina cruceña de olla, servida como en casa desde 1998.",
        "tienda_virtual",
      ),
      categorias: [
        {
          id: "demo-platos",
          nombre: "Platos del día",
          icono: "gorro-chef",
          productos: [
            producto(1, {
              nombre: "Majadito de charque",
              descripcion: "Arroz con charque, huevo frito y plátano.",
              precio: 35,
              disponibles: 8,
              imagen: {
                src: "/demo/productos/hamburguesa.webp",
                alt: "Plato servido de la casa",
              },
            }),
            producto(2, {
              nombre: "Silpancho con papa",
              descripcion: "Carne apanada, arroz, papa dorada y huevo.",
              precio: 38,
              disponibles: 12,
              imagen: {
                src: "/demo/productos/papas.webp",
                alt: "Porción de papa dorada",
              },
            }),
          ],
        },
        {
          id: "demo-bebidas",
          nombre: "Bebidas",
          icono: "vaso",
          productos: [
            producto(3, {
              nombre: "Limonada de la casa",
              descripcion: "Preparada al momento, con hielo y menta.",
              precio: 12,
              disponibles: 20,
              imagen: {
                src: "/demo/productos/limonada.webp",
                alt: "Vaso de limonada fría",
              },
            }),
          ],
        },
      ],
    },
  },
  {
    id: "ferreteria",
    rubro: "Ferretería",
    gancho: "Muchos productos, precio grande, foto chica.",
    plantilla: "feria",
    paleta: "grafito",
    datos: {
      negocio: negocio(
        "Ferretería El Tornillo",
        "Herramienta, sanitario y eléctrico. Atendemos desde 1995.",
        "tienda_virtual",
      ),
      categorias: [
        {
          id: "demo-electrico",
          nombre: "Eléctrico",
          icono: "foco",
          productos: [
            producto(1, {
              nombre: "Cable THW 12 AWG",
              descripcion: "Por metro. Rollo de 100 m disponible.",
              precio: 8.5,
            }),
            producto(2, {
              nombre: "Foco LED 9 W luz fría",
              descripcion: "Rosca E27. Garantía de un año.",
              precio: 18,
              disponibles: 40,
            }),
            producto(3, {
              nombre: "Tomacorriente doble",
              descripcion: "Con placa. Marca nacional.",
              precio: 22,
            }),
          ],
        },
        {
          id: "demo-fijacion",
          nombre: "Fijación",
          icono: "tornillo",
          productos: [
            producto(4, {
              nombre: "Tornillo autoperforante 8x1",
              descripcion: "Por unidad. Descuento por ciento.",
              precio: 1.5,
            }),
            producto(5, {
              nombre: "Taco fischer S8",
              descripcion: "Bolsa de 100 unidades.",
              precio: 35,
              disponibles: 6,
            }),
          ],
        },
      ],
    },
  },
  {
    id: "barberia",
    rubro: "Barbería",
    gancho: "Servicios con turno en vez de carrito.",
    plantilla: "minimal",
    paleta: "altiplano",
    datos: {
      negocio: negocio(
        "Barbería Central",
        "Cortes clásicos y arreglo de barba, con turno reservado.",
        "catalogo_cta",
      ),
      categorias: [
        {
          id: "demo-cortes",
          nombre: "Cortes",
          icono: "tijeras",
          productos: [
            producto(1, {
              nombre: "Corte clásico",
              descripcion: "Tijera y máquina, con lavado. Unos 40 minutos.",
              precio: 40,
            }),
            producto(2, {
              nombre: "Corte y barba",
              descripcion: "Incluye toalla caliente y perfilado.",
              precio: 60,
            }),
          ],
        },
        {
          id: "demo-cuidado",
          nombre: "Cuidado",
          icono: "brocha",
          productos: [
            producto(3, {
              nombre: "Arreglo de barba",
              descripcion: "Perfilado y aceite. Unos 20 minutos.",
              precio: 25,
            }),
          ],
        },
      ],
    },
  },
  {
    id: "abarrotes",
    rubro: "Tienda de barrio",
    gancho: "Lo de siempre, a mano y con precio a la vista.",
    plantilla: "feria",
    paleta: "mercado",
    datos: {
      negocio: negocio(
        "Tienda Doña Rosa",
        "Abarrotes, bebidas y limpieza. Puerta a puerta en el barrio.",
        "tienda_virtual",
      ),
      categorias: [
        {
          id: "demo-abarrotes",
          nombre: "Abarrotes",
          icono: "canasta",
          productos: [
            producto(1, {
              nombre: "Arroz grano de oro 1 kg",
              descripcion: "Bolsa sellada.",
              precio: 9,
              disponibles: 25,
            }),
            producto(2, {
              nombre: "Aceite girasol 900 ml",
              descripcion: "Botella.",
              precio: 14.5,
              disponibles: 18,
            }),
            producto(3, {
              nombre: "Azúcar 1 kg",
              descripcion: "Bolsa.",
              precio: 7,
            }),
          ],
        },
        {
          id: "demo-limpieza",
          nombre: "Limpieza",
          icono: "aerosol",
          productos: [
            producto(4, {
              nombre: "Detergente 1 kg",
              descripcion: "Rinde para 20 lavados.",
              precio: 18,
              disponibles: 9,
            }),
          ],
        },
      ],
    },
  },
];
