import type { SiembraDeRubro } from "./tipos";

/* La venta por volumen.
 *
 * «Pedido mínimo» es el campo que separa a una distribuidora de una tienda, y es
 * el que hoy no se podía expresar en el sistema. Las presentaciones —«caja de
 * 12»— son variantes con precio propio, que es el caso que el modelo tiene que
 * sostener y que ningún otro rubro ejercitaba. */
const COMUNES = [
  { clave: "presentacion", nombre: "Presentación", tipo: "texto" as const, enTarjeta: true },
  {
    clave: "unidades_por_caja",
    nombre: "Unidades por caja",
    tipo: "numero" as const,
    unidad: "unidades",
    enTarjeta: true,
  },
  { clave: "marca", nombre: "Marca", tipo: "texto" as const, enTarjeta: true },
  {
    clave: "pedido_minimo",
    nombre: "Pedido mínimo",
    tipo: "numero" as const,
    unidad: "cajas",
  },
];

export const DISTRIBUIDORA: SiembraDeRubro = {
  rubro: "distribuidora",
  patron: "abarrotes",
  paletaSugerida: "oceano",
  modalidadSugerida: "catalogo_cta",
  categorias: [
    { nombre: "Abarrotes", icono: "canasta", vende: "cosas", atributos: [...COMUNES] },
    { nombre: "Bebidas", icono: "vaso", vende: "cosas", atributos: [...COMUNES] },
    { nombre: "Limpieza", icono: "aerosol", vende: "cosas", atributos: [...COMUNES] },
    { nombre: "Desechables", icono: "caja", vende: "cosas", atributos: [...COMUNES] },
  ],
};
