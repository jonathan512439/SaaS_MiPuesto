import type { DatosPlantilla } from "./tipos";

type DatosNegocioDemo = {
  nombre: string;
  descripcion: string | null;
  telefonoWhatsapp: string;
};

export function crearDatosDemoPlantilla({
  nombre,
  descripcion,
  telefonoWhatsapp,
}: DatosNegocioDemo): DatosPlantilla {
  return {
    negocio: {
      nombre,
      descripcion:
        descripcion?.trim() ||
        "Productos y servicios preparados para atenderte con la cercanía de siempre.",
      telefonoWhatsapp,
      horarioTexto: "Abierto hoy hasta las 21:30",
    },
    categorias: [
      {
        id: "demo-destacados",
        nombre: "Más pedidos",
        productos: [
          {
            id: "demo-1",
            nombre: "Hamburguesa de la casa",
            descripcion: "Doble carne, queso, vegetales frescos y nuestra salsa especial.",
            precio: 45,
            imagen: {
              src: "/demo/productos/hamburguesa.webp",
              alt: "Hamburguesa doble con queso y vegetales frescos",
            },
          },
          {
            id: "demo-2",
            nombre: "Papas con salsa",
            descripcion: "Papas rústicas doradas acompañadas con salsa de la casa.",
            precio: 32,
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
            nombre: "Limonada artesanal",
            descripcion: "Preparada al momento con limón, hielo y hojas de menta.",
            precio: 18,
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
