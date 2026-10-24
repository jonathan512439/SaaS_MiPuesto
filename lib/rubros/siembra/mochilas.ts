import type { SiembraDeRubro } from "./tipos";

/* Mochilas, bolsos y maletas (2026-10-23).
 *
 * Llegó con la primera tienda de mochilas, que cayó en «Otro» porque ningún
 * rubro la cubría: como ropa le habrían preguntado la temporada, y lo que pregunta
 * quien compra una mochila es cuánto entra y para quién es.
 *
 * El tamaño —chica, mediana, grande— no es un campo: es una presentación, cada
 * una con su precio y sus existencias, igual que las tallas en la ropa. Los
 * campos describen la mochila entera. */
const COLOR = { clave: "color", nombre: "Color", tipo: "texto" as const, enTarjeta: true };
const MATERIAL = { clave: "material", nombre: "Material", tipo: "texto" as const };
const CAPACIDAD = {
  clave: "capacidad",
  nombre: "Capacidad",
  tipo: "numero" as const,
  unidad: "litros",
  enTarjeta: true,
};
const PARA_QUIEN = {
  clave: "para_quien",
  nombre: "Para quién",
  tipo: "opcion" as const,
  opciones: ["Niño", "Joven", "Adulto"],
  enTarjeta: true,
};

export const MOCHILAS: SiembraDeRubro = {
  rubro: "mochilas",
  patron: "equipaje",
  paletaSugerida: "oceano",
  modalidadSugerida: "tienda_virtual",
  categorias: [
    {
      nombre: "Mochilas escolares",
      icono: "mochila",
      vende: "cosas",
      atributos: [COLOR, PARA_QUIEN, CAPACIDAD, MATERIAL],
    },
    {
      nombre: "Mochilas de viaje",
      icono: "avion",
      vende: "cosas",
      atributos: [
        COLOR,
        CAPACIDAD,
        MATERIAL,
        { clave: "impermeable", nombre: "Impermeable", tipo: "si_no" },
      ],
    },
    {
      nombre: "Bolsos y carteras",
      icono: "cartera",
      vende: "cosas",
      atributos: [COLOR, MATERIAL],
    },
    {
      nombre: "Maletas",
      icono: "maleta",
      vende: "cosas",
      atributos: [
        COLOR,
        CAPACIDAD,
        MATERIAL,
        { clave: "ruedas", nombre: "Ruedas", tipo: "numero" as const, unidad: "ruedas" },
      ],
    },
    {
      nombre: "Loncheras y accesorios",
      icono: "bolso",
      vende: "cosas",
      atributos: [COLOR, PARA_QUIEN],
    },
  ],
};
