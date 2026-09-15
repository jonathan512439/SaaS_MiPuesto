import type { SiembraDeRubro } from "./tipos";

/* Cuatro categorías y los campos que de verdad decide un comensal: si pica, si
   es vegetariano y para cuántos alcanza. La carta del día, el menú imprimible y
   el número de mesa los habilita el rubro aparte, en `rubroOfrece`. */
export const RESTAURANTE: SiembraDeRubro = {
  rubro: "restaurante",
  patron: "comida",
  paletaSugerida: "mercado",
  modalidadSugerida: "catalogo_cta",
  categorias: [
    {
      nombre: "Almuerzos",
      icono: "cubiertos",
      vende: "cosas",
      atributos: [
        {
          clave: "porcion",
          nombre: "Porción",
          tipo: "opcion",
          opciones: ["Personal", "Para dos", "Familiar"],
          enTarjeta: true,
        },
        { clave: "acompanamiento", nombre: "Acompañamiento", tipo: "texto", enTarjeta: true },
        { clave: "picante", nombre: "Picante", tipo: "si_no", enTarjeta: true },
        { clave: "vegetariano", nombre: "Vegetariano", tipo: "si_no", enTarjeta: true },
      ],
    },
    {
      nombre: "Platos a la carta",
      icono: "gorro-chef",
      vende: "cosas",
      atributos: [
        {
          clave: "porcion",
          nombre: "Porción",
          tipo: "opcion",
          opciones: ["Personal", "Para dos", "Familiar"],
          enTarjeta: true,
        },
        { clave: "acompanamiento", nombre: "Acompañamiento", tipo: "texto", enTarjeta: true },
        { clave: "picante", nombre: "Picante", tipo: "si_no", enTarjeta: true },
        { clave: "vegetariano", nombre: "Vegetariano", tipo: "si_no", enTarjeta: true },
      ],
    },
    {
      nombre: "Bebidas",
      icono: "vaso",
      vende: "cosas",
      atributos: [
        { clave: "tamano", nombre: "Tamaño", tipo: "numero", unidad: "ml", enTarjeta: true },
        { clave: "con_alcohol", nombre: "Con alcohol", tipo: "si_no" },
      ],
    },
    { nombre: "Postres", icono: "torta", vende: "cosas" },
  ],
};
