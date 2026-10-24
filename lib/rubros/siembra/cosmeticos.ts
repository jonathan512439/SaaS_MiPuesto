import type { SiembraDeRubro } from "./tipos";

/* Cosméticos y cuidado de la piel (2026-10-24).
 *
 * La tienda de cremas y sérums no cabía en «Belleza», que es de turnos —barbería,
 * salón, uñas— y no vende frascos. En «Importados» arrancaba sin un solo campo,
 * cuando lo que pregunta quien compra un sérum es para qué piel es, cuándo se
 * pone y qué trae.
 *
 * El tamaño —30 ml, 50 ml— no es un campo: es una presentación, cada una con su
 * precio y sus existencias, igual que las tallas en la ropa. Los campos
 * describen el producto entero. */
const TIPO_DE_PIEL = {
  clave: "tipo_de_piel",
  nombre: "Tipo de piel",
  tipo: "opcion" as const,
  opciones: ["Todo tipo", "Grasa", "Seca", "Mixta", "Sensible"],
  enTarjeta: true,
};
const MOMENTO = {
  clave: "momento",
  nombre: "Cuándo se usa",
  tipo: "opcion" as const,
  opciones: ["Día", "Noche", "Día y noche"],
};
const INGREDIENTE = {
  clave: "ingrediente",
  nombre: "Ingrediente principal",
  tipo: "texto" as const,
  enTarjeta: true,
};

export const COSMETICOS: SiembraDeRubro = {
  rubro: "cosmeticos",
  patron: "cosmetica",
  paletaSugerida: "jazmin",
  modalidadSugerida: "tienda_virtual",
  categorias: [
    {
      nombre: "Limpieza",
      icono: "jabon",
      vende: "cosas",
      atributos: [TIPO_DE_PIEL, MOMENTO, INGREDIENTE],
    },
    {
      nombre: "Sérums",
      icono: "gota",
      vende: "cosas",
      atributos: [TIPO_DE_PIEL, INGREDIENTE, MOMENTO],
    },
    {
      nombre: "Hidratantes",
      icono: "cuidado",
      vende: "cosas",
      atributos: [TIPO_DE_PIEL, MOMENTO, INGREDIENTE],
    },
    {
      nombre: "Protector solar",
      icono: "sol",
      vende: "cosas",
      atributos: [
        TIPO_DE_PIEL,
        { clave: "fps", nombre: "FPS", tipo: "numero" as const, enTarjeta: true },
        { clave: "con_color", nombre: "Con color", tipo: "si_no" as const },
      ],
    },
    {
      nombre: "Mascarillas y ojos",
      icono: "ojo",
      vende: "cosas",
      atributos: [TIPO_DE_PIEL, INGREDIENTE],
    },
    {
      nombre: "Maquillaje",
      icono: "destello",
      vende: "cosas",
      atributos: [
        { clave: "tono", nombre: "Tono", tipo: "texto" as const, enTarjeta: true },
        {
          clave: "acabado",
          nombre: "Acabado",
          tipo: "opcion" as const,
          opciones: ["Mate", "Natural", "Luminoso"],
        },
      ],
    },
    {
      nombre: "Kits y regalos",
      icono: "regalo",
      vende: "cosas",
      atributos: [TIPO_DE_PIEL],
    },
  ],
};
