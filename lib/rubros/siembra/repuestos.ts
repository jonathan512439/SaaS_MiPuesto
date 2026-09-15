import type { SiembraDeRubro } from "./tipos";

/* El rubro más técnico, y donde el buscador por atributo es lo que se usa: nadie
 * busca «filtro», busca «filtro para Toyota Corolla 2015».
 *
 * «Año desde» y «Año hasta» son dos campos y no un rango porque el tipo `numero`
 * alcanza, y un tipo `rango` nuevo se usaría en un solo rubro. Se agrega el día
 * que un segundo rubro lo necesite, no antes. */
const COMUNES = [
  { clave: "marca_vehiculo", nombre: "Marca del vehículo", tipo: "texto" as const, enTarjeta: true },
  { clave: "modelo", nombre: "Modelo", tipo: "texto" as const, enTarjeta: true },
  { clave: "anio_desde", nombre: "Año desde", tipo: "numero" as const },
  { clave: "anio_hasta", nombre: "Año hasta", tipo: "numero" as const },
  { clave: "codigo_de_parte", nombre: "Código de parte", tipo: "texto" as const, enTarjeta: true },
  {
    clave: "original_o_alternativo",
    nombre: "Original o alternativo",
    tipo: "opcion" as const,
    opciones: ["Original", "Alternativo"],
    enTarjeta: true,
  },
];

export const REPUESTOS: SiembraDeRubro = {
  rubro: "repuestos",
  patron: "herramientas",
  paletaSugerida: "grafito",
  modalidadSugerida: "catalogo_cta",
  categorias: [
    { nombre: "Motor", icono: "engranaje", vende: "cosas", atributos: [...COMUNES] },
    { nombre: "Frenos", icono: "disco-de-freno", vende: "cosas", atributos: [...COMUNES] },
    { nombre: "Suspensión", icono: "auto", vende: "cosas", atributos: [...COMUNES] },
    { nombre: "Filtros y lubricantes", icono: "gota", vende: "cosas", atributos: [...COMUNES] },
    { nombre: "Eléctrico", icono: "bateria", vende: "cosas", atributos: [...COMUNES] },
    { nombre: "Moto", icono: "moto", vende: "cosas", atributos: [...COMUNES] },
  ],
};
