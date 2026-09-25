import type { NombreIconoCatalogo } from "../iconos/catalogo";
import type { RubroPublicoId } from "../../lib/negocios/rubros-publicos";

/* El dibujo de cada rubro público, para las baldosas del directorio.
 *
 * Vive acá y no en `lib/`: es una decisión de cómo se ve, no un dato del
 * negocio. Un rubro sin dibujo cae en la caja genérica en vez de romper. */
export const ICONO_DE_RUBRO: Record<RubroPublicoId, NombreIconoCatalogo> = {
  restaurante: "cubiertos",
  polleria: "pollo",
  comida_rapida: "sandwich",
  salteneria: "bandeja",
  cafeteria: "cafe",
  panaderia: "trigo",
  tienda_barrio: "tienda",
  minimarket: "canasta",
  licoreria: "vino",
  jugueteria: "juego",
  libreria: "libro",
  regalos: "regalo",
  electronica: "celular",
  muebles: "sofa",
  artesanias: "costura",
  importados: "caja-abierta",
  ropa_y_calzado: "remera",
  accesorios: "joya",
  ferreteria: "martillo",
  distribuidora: "cajas",
  repuestos: "disco-de-freno",
  taller_mecanico: "engranaje",
  barberia: "tijeras",
  salon_belleza: "chispas",
  consultorio: "estetoscopio",
  clases: "libro-abierto",
  otros_servicios: "maletin",
  veterinaria: "perro",
  mascotas: "gato",
  otro: "caja-general",
};

/* Lo más buscado: atajos que muestran qué se puede buscar sin explicarlo. */
export const BUSQUEDAS_POPULARES: ReadonlyArray<{ texto: string; icono: NombreIconoCatalogo }> = [
  { texto: "Almuerzo", icono: "cubiertos" },
  { texto: "Pollo", icono: "pollo" },
  { texto: "Tortas", icono: "torta" },
  { texto: "Ropa", icono: "remera" },
  { texto: "Celulares", icono: "celular" },
  { texto: "Ferretería", icono: "martillo" },
  { texto: "Barbería", icono: "tijeras" },
  { texto: "Mascotas", icono: "perro" },
];

/* Las palabras que rotan en el buscador vacío. */
export const EJEMPLOS_DE_BUSQUEDA = [
  "almuerzo",
  "pollo broaster",
  "tortas",
  "zapatillas",
  "ferretería",
  "juguetes",
  "barbería",
] as const;
