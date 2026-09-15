import type { SiembraDeRubro } from "./tipos";

/* El rubro que originó los campos por categoría, y el que más los usa: un foco
   se elige por potencia y casquillo, y sin esos dos datos el catálogo obliga a
   preguntar por WhatsApp lo que debería estar escrito. */
export const FERRETERIA: SiembraDeRubro = {
  rubro: "ferreteria",
  patron: "herramientas",
  paletaSugerida: "tierra",
  modalidadSugerida: "catalogo_cta",
  categorias: [
    { nombre: "Herramienta manual", icono: "martillo", vende: "cosas" },
    { nombre: "Herramienta eléctrica", icono: "taladro", vende: "cosas" },
    {
      nombre: "Eléctrico e iluminación",
      icono: "foco",
      vende: "cosas",
      atributos: [
        { clave: "potencia", nombre: "Potencia", tipo: "numero", unidad: "W", enTarjeta: true },
        {
          clave: "casquillo",
          nombre: "Casquillo",
          tipo: "opcion",
          opciones: ["E27", "E14", "GU10", "B22", "G9"],
          enTarjeta: true,
        },
        {
          clave: "color_de_luz",
          nombre: "Color de luz",
          tipo: "opcion",
          opciones: ["Cálida", "Neutra", "Fría"],
          enTarjeta: true,
        },
        { clave: "regulable", nombre: "Regulable", tipo: "si_no" },
        { clave: "vida_util", nombre: "Vida útil", tipo: "numero", unidad: "horas" },
      ],
    },
    /* El plan pedía un ícono «llave-de-paso» que no existe en el juego generado.
       Se usa «llave», que es el que hay y el que se entiende. */
    { nombre: "Plomería", icono: "llave", vende: "cosas" },
    {
      nombre: "Pinturas",
      icono: "rodillo",
      vende: "cosas",
      atributos: [
        { clave: "contenido", nombre: "Contenido", tipo: "numero", unidad: "litros", enTarjeta: true },
        {
          clave: "acabado",
          nombre: "Acabado",
          tipo: "opcion",
          opciones: ["Mate", "Satinado", "Brillante"],
          enTarjeta: true,
        },
        { clave: "base", nombre: "Base", tipo: "opcion", opciones: ["Agua", "Aceite"] },
        { clave: "rendimiento", nombre: "Rendimiento", tipo: "numero", unidad: "m² por litro" },
      ],
    },
    {
      nombre: "Tornillería",
      icono: "tornillo",
      vende: "cosas",
      atributos: [
        { clave: "medida", nombre: "Medida", tipo: "texto", enTarjeta: true },
        {
          clave: "material",
          nombre: "Material",
          tipo: "opcion",
          opciones: ["Acero", "Inoxidable", "Galvanizado"],
          enTarjeta: true,
        },
        {
          clave: "cabeza",
          nombre: "Cabeza",
          tipo: "opcion",
          opciones: ["Plana", "Redonda", "Hexagonal"],
        },
        {
          clave: "se_vende_por",
          nombre: "Se vende por",
          tipo: "opcion",
          opciones: ["Unidad", "Caja", "Kilo"],
          enTarjeta: true,
        },
      ],
    },
  ],
};
