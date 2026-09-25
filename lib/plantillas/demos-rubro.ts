import { FORMA_TARJETA_POR_OMISION, type PaletaId } from "../apariencia";
import { evaluarHorario } from "../horario";
import { obtenerComportamientoModalidad } from "../modalidades";
import { SIN_TEXTO } from "../negocios/texto-sobre-imagen";
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
    portadaTexto: SIN_TEXTO,
    formaTarjeta: FORMA_TARJETA_POR_OMISION,
    qrPagoUrl: null,
    ubicacionUrl: null,
    pideNumeroMesa: false,
    topeUnidadesPedido: null,
    resenasUrl: null,
    rubro: null,
    patronFondo: true,
    patronOpacidad: 6,
    subnombre: null,
    redesSociales: [],
    banners: [],
  };
}

export const DEMOS_POR_RUBRO: DemoRubro[] = [
  {
    id: "restaurante",
    rubro: "Restaurante",
    gancho: "Carta por categorías y pedidos con carrito.",
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

/* Las muestras de la vista previa de «Tu marca» y de Apariencia, por siembra.
 *
 * La vista previa mostraba hamburguesa, papas y limonada en cualquier rubro: una
 * ferretería elegía su color viendo comida. Ahora cada rubro ve cosas de su
 * rubro. Las que ya existían para la portada se reusan tal cual; las demás
 * siguen la misma regla de este archivo —sin fotografía, con los datos propios
 * del rubro escritos como se ven—, que además es como se ve un catálogo el
 * primer día. El restaurante no está: conserva la muestra de siempre, con las
 * únicas fotos que existen. */
type CategoriaMuestra = DatosPlantilla["categorias"][number];

const demo = (id: string) => DEMOS_POR_RUBRO.find((d) => d.id === id)!.datos.categorias;

const MUESTRAS_NUEVAS: Record<string, CategoriaMuestra[]> = {
  ropa_y_calzado: [
    {
      id: "demo-dama",
      nombre: "Ropa de dama",
      icono: "remera",
      productos: [
        producto(1, {
          nombre: "Vestido de verano",
          descripcion: "Fresco y con vuelo, de algodón liviano.",
          precio: 190,
          disponibles: 4,
          datosPropios: [{ nombre: "Color", texto: "Rojo" }],
        }),
        producto(2, {
          nombre: "Blusa de lino",
          descripcion: "Corte suelto, combina con jean o falda.",
          precio: 135,
          datosPropios: [{ nombre: "Color", texto: "Blanco" }],
        }),
      ],
    },
    {
      id: "demo-calzado",
      nombre: "Calzado",
      icono: "calzado",
      productos: [
        producto(3, {
          nombre: "Zapatillas urbanas",
          descripcion: "Livianas, con suela antideslizante. Del 35 al 40.",
          precio: 280,
          disponibles: 3,
          datosPropios: [{ nombre: "Color", texto: "Blanco" }],
        }),
      ],
    },
  ],
  distribuidora: [
    {
      id: "demo-abarrotes-mayor",
      nombre: "Abarrotes",
      icono: "canasta",
      productos: [
        producto(1, {
          nombre: "Arroz por quintal",
          descripcion: "Bolsa de 46 kg. Precio por mayor desde cinco.",
          precio: 420,
          disponibles: 30,
        }),
        producto(2, {
          nombre: "Azúcar por quintal",
          descripcion: "Bolsa de 46 kg, refinada.",
          precio: 380,
        }),
      ],
    },
    {
      id: "demo-bebidas-mayor",
      nombre: "Bebidas",
      icono: "vaso",
      productos: [
        producto(3, {
          nombre: "Agua en bidón de 20 L",
          descripcion: "Con entrega a domicilio desde diez bidones.",
          precio: 15,
          disponibles: 60,
        }),
      ],
    },
  ],
  repuestos: [
    {
      id: "demo-frenos",
      nombre: "Frenos",
      icono: "disco-de-freno",
      productos: [
        producto(1, {
          nombre: "Pastillas de freno delanteras",
          descripcion: "Juego de cuatro, cerámicas.",
          precio: 180,
          disponibles: 5,
          datosPropios: [{ nombre: "Compatible con", texto: "Toyota Corolla 2010–2018" }],
        }),
        producto(2, {
          nombre: "Disco de freno ventilado",
          descripcion: "Por unidad. Se recomienda cambiar en par.",
          precio: 320,
          datosPropios: [{ nombre: "Compatible con", texto: "Nissan Sentra 2013–2019" }],
        }),
      ],
    },
    {
      id: "demo-filtros",
      nombre: "Filtros y lubricantes",
      icono: "gota",
      productos: [
        producto(3, {
          nombre: "Filtro de aceite",
          descripcion: "Rosca 3/4. Para motores de 1.6 a 2.0.",
          precio: 45,
          disponibles: 12,
        }),
      ],
    },
  ],
  veterinaria: [
    {
      id: "demo-alimento",
      nombre: "Alimento",
      icono: "hueso",
      productos: [
        producto(1, {
          nombre: "Alimento perro adulto 3 kg",
          descripcion: "Croquetas para raza mediana.",
          precio: 95,
          disponibles: 7,
          datosPropios: [{ nombre: "Para", texto: "Perro adulto" }],
        }),
        producto(2, {
          nombre: "Alimento gato 1,5 kg",
          descripcion: "Con pollo y arroz.",
          precio: 70,
          datosPropios: [{ nombre: "Para", texto: "Gato" }],
        }),
      ],
    },
    {
      id: "demo-higiene",
      nombre: "Higiene y cuidado",
      icono: "tina",
      productos: [
        producto(3, {
          nombre: "Champú antipulgas 250 ml",
          descripcion: "Para perros y gatos desde los tres meses.",
          precio: 45,
        }),
      ],
    },
  ],
  servicios: [
    {
      id: "demo-reparaciones",
      nombre: "Reparaciones",
      icono: "notebook",
      productos: [
        producto(1, {
          nombre: "Mantenimiento de laptop",
          descripcion: "Limpieza interna y cambio de pasta térmica. En el día.",
          precio: 120,
        }),
        producto(2, {
          nombre: "Formateo con respaldo",
          descripcion: "Guardamos tus archivos antes de empezar.",
          precio: 90,
        }),
      ],
    },
    {
      id: "demo-clases",
      nombre: "Clases",
      icono: "libro",
      productos: [
        producto(3, {
          nombre: "Clase particular de matemáticas",
          descripcion: "Una hora, en tu casa o por videollamada.",
          precio: 50,
        }),
      ],
    },
  ],
  otro: [
    {
      id: "demo-mas-pedido",
      nombre: "Lo más pedido",
      icono: "estrella",
      productos: [
        producto(1, {
          nombre: "Mochila escolar",
          descripcion: "Tela impermeable, dos bolsillos, para laptop de 15 pulgadas.",
          precio: 120,
          disponibles: 10,
        }),
        producto(2, {
          nombre: "Taza con tu nombre",
          descripcion: "Cerámica, lista en dos días.",
          precio: 35,
        }),
      ],
    },
    {
      id: "demo-encargo",
      nombre: "Por encargo",
      icono: "regalo",
      productos: [
        producto(3, {
          nombre: "Llavero grabado",
          descripcion: "Con el nombre o la fecha que quieras.",
          precio: 15,
        }),
      ],
    },
  ],
};

/* Las muestras sin fotografía de cada siembra, o `null` si el rubro usa la de
   siempre (el restaurante, o un negocio que todavía no eligió). */
export function categoriasDeMuestra(rubro: string | null | undefined): CategoriaMuestra[] | null {
  switch (rubro) {
    case "ferreteria":
      return demo("ferreteria");
    case "belleza":
      return demo("barberia");
    case "tienda_barrio":
      return demo("abarrotes");
    default:
      return rubro ? (MUESTRAS_NUEVAS[rubro] ?? null) : null;
  }
}
