import type { SiembraDeRubro } from "./tipos";

/* El rubro donde las **variantes** hacen todo el trabajo.
 *
 * Las tallas no son un campo: son variantes, cada una con su stock. Es la
 * diferencia entre «esta remera viene en M» y «me quedan 3 en M». Por eso acá los
 * campos son los que describen la prenda entera —color, material, temporada— y
 * no los que cambian de una unidad a otra. */
export const ROPA_Y_CALZADO: SiembraDeRubro = {
  rubro: "ropa_y_calzado",
  patron: "vestuario",
  paletaSugerida: "jazmin",
  modalidadSugerida: "tienda_virtual",
  categorias: [
    {
      nombre: "Ropa de dama",
      icono: "remera",
      vende: "cosas",
      atributos: [
        { clave: "color", nombre: "Color", tipo: "texto", enTarjeta: true },
        { clave: "material", nombre: "Material", tipo: "texto" },
        {
          clave: "temporada",
          nombre: "Temporada",
          tipo: "opcion",
          opciones: ["Verano", "Invierno", "Todo el año"],
        },
      ],
    },
    {
      nombre: "Ropa de varón",
      icono: "remera",
      vende: "cosas",
      atributos: [
        { clave: "color", nombre: "Color", tipo: "texto", enTarjeta: true },
        { clave: "material", nombre: "Material", tipo: "texto" },
        {
          clave: "temporada",
          nombre: "Temporada",
          tipo: "opcion",
          opciones: ["Verano", "Invierno", "Todo el año"],
        },
      ],
    },
    {
      nombre: "Calzado",
      icono: "calzado",
      vende: "cosas",
      atributos: [
        { clave: "color", nombre: "Color", tipo: "texto", enTarjeta: true },
        { clave: "material", nombre: "Material", tipo: "texto" },
        {
          clave: "temporada",
          nombre: "Temporada",
          tipo: "opcion",
          opciones: ["Verano", "Invierno", "Todo el año"],
        },
      ],
    },
    { nombre: "Accesorios", icono: "reloj", vende: "cosas" },
  ],
};
