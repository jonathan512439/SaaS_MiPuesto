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
    },
    categorias: [
      {
        id: "demo-destacados",
        nombre: "Más pedidos",
        productos: [
          {
            id: "demo-1",
            nombre: "Especial de la casa",
            descripcion: "Una opción recomendada para conocer lo mejor del negocio.",
            precio: 45,
          },
          {
            id: "demo-2",
            nombre: "Favorito de siempre",
            descripcion: "Una alternativa práctica para cualquier momento del día.",
            precio: 32,
          },
        ],
      },
      {
        id: "demo-novedades",
        nombre: "Novedades",
        productos: [
          {
            id: "demo-3",
            nombre: "Nueva propuesta",
            descripcion: "Disponible por tiempo limitado mientras preparamos más opciones.",
            precio: 58,
          },
        ],
      },
    ],
  };
}
