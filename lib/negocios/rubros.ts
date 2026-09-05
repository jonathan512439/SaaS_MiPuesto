/* El rubro es el segundo eje del negocio: `tipo_negocio` dice cómo vende
   —lectura, acción, carrito—, el rubro dice qué vende.

   Regla que no se rompe: **el rubro oculta interfaz, nunca datos ni permisos.**
   Cambiar de rubro apaga botones; no borra ni esconde nada de lo cargado. Por
   eso `funciones` es una lista de pantallas, no de permisos. */
export const RUBROS = [
  "restaurante",
  "tienda_barrio",
  "ropa_y_calzado",
  "ferreteria",
  "servicios",
  "belleza",
  "otro",
] as const;

export type RubroId = (typeof RUBROS)[number];

/* Solo dos funciones por ahora, y las dos del mismo paquete. La lista crece
   cuando una función nueva de verdad no le sirve a todos, no antes: inventar
   banderas para funciones que no existen es adivinar. */
export type FuncionDeRubro = "carta_del_dia" | "menu_imprimible";

export const DEFINICIONES_RUBROS: ReadonlyArray<{
  id: RubroId;
  nombre: string;
  ejemplo: string;
  funciones: ReadonlyArray<FuncionDeRubro>;
}> = [
  {
    id: "restaurante",
    nombre: "Restaurante o comida",
    ejemplo: "Almuerzos, pollos, pizzería, café",
    funciones: ["carta_del_dia", "menu_imprimible"],
  },
  {
    id: "tienda_barrio",
    nombre: "Tienda de barrio",
    ejemplo: "Abarrotes, bebidas, limpieza",
    funciones: ["menu_imprimible"],
  },
  {
    id: "ropa_y_calzado",
    nombre: "Ropa y calzado",
    ejemplo: "Boutique, deportivo, infantil",
    funciones: [],
  },
  {
    id: "ferreteria",
    nombre: "Ferretería y materiales",
    ejemplo: "Herramienta, eléctrico, sanitario",
    funciones: ["menu_imprimible"],
  },
  {
    id: "servicios",
    nombre: "Servicios con turno",
    ejemplo: "Taller, consultorio, cerrajería",
    funciones: [],
  },
  {
    id: "belleza",
    nombre: "Belleza y cuidado personal",
    ejemplo: "Barbería, salón, uñas",
    funciones: [],
  },
  {
    id: "otro",
    nombre: "Otro",
    ejemplo: "Nada de lo anterior se parece",
    funciones: [],
  },
];

export function esRubroId(valor: unknown): valor is RubroId {
  return typeof valor === "string" && (RUBROS as readonly string[]).includes(valor);
}

/* Sin rubro elegido se ofrece todo. Los negocios que ya existen no eligieron
   ninguno y no se les va a adivinar uno: quitarles pantallas que hoy usan
   sería un castigo por no haber contestado una pregunta que nunca se les hizo. */
export function rubroOfrece(rubro: unknown, funcion: FuncionDeRubro): boolean {
  if (!esRubroId(rubro)) return true;
  const definicion = DEFINICIONES_RUBROS.find(({ id }) => id === rubro);
  return definicion ? definicion.funciones.includes(funcion) : true;
}

export function nombreDeRubro(rubro: unknown): string {
  const definicion = esRubroId(rubro)
    ? DEFINICIONES_RUBROS.find(({ id }) => id === rubro)
    : undefined;
  return definicion?.nombre ?? "Sin definir";
}
