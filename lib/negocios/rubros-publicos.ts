import type { RubroId } from "./rubros";

/* Lo que vende el negocio, dicho como lo busca el cliente. Fase 11.
 *
 * **Son dos capas, a propósito.** `rubro` es la siembra: decide qué categorías y
 * qué campos se crean en el alta, queda fijo al terminarla, y hay diez. Este
 * es el rubro público: lo que el cliente ve en los filtros del directorio, en
 * palabras de la calle —«Pollería y broaster», no «Restaurante o comida»—, y
 * cada uno sabe qué siembra usar.
 *
 * Así el dueño elige **una sola vez y en su idioma**, y sumar un rubro público
 * es una línea acá, no una siembra nueva. Elegido, el dueño no lo cambia: nos
 * escribe y lo cambia la plataforma (`rubroQuedoFijo`, más abajo).
 *
 * La lista está repetida en la restricción de `negocios.rubro_publico` y una
 * prueba compara las dos. Quedan afuera a propósito, y por escrito en el plan:
 * farmacia, naturista, alojamiento, casas de cambio, armerías y loterías.
 */

export const GRUPOS_RUBROS_PUBLICOS = [
  "Comida",
  "Tiendas",
  "Ropa",
  "Construcción",
  "Por mayor",
  "Vehículos",
  "Belleza",
  "Servicios",
  "Mascotas",
  "Otro",
] as const;

export type GrupoRubroPublico = (typeof GRUPOS_RUBROS_PUBLICOS)[number];

export const RUBROS_PUBLICOS = [
  { id: "restaurante", nombre: "Restaurante", grupo: "Comida", siembra: "restaurante" },
  { id: "polleria", nombre: "Pollería y broaster", grupo: "Comida", siembra: "restaurante" },
  { id: "comida_rapida", nombre: "Comida rápida", grupo: "Comida", siembra: "restaurante" },
  { id: "salteneria", nombre: "Salteñería y empanadas", grupo: "Comida", siembra: "restaurante" },
  { id: "cafeteria", nombre: "Cafetería y heladería", grupo: "Comida", siembra: "restaurante" },
  { id: "panaderia", nombre: "Panadería y pastelería", grupo: "Comida", siembra: "restaurante" },
  { id: "tienda_barrio", nombre: "Tienda de barrio", grupo: "Tiendas", siembra: "tienda_barrio" },
  { id: "minimarket", nombre: "Minimarket y abarrotes", grupo: "Tiendas", siembra: "tienda_barrio" },
  { id: "licoreria", nombre: "Licorería", grupo: "Tiendas", siembra: "tienda_barrio" },
  { id: "jugueteria", nombre: "Juguetería", grupo: "Tiendas", siembra: "tienda_barrio" },
  { id: "libreria", nombre: "Librería y papelería", grupo: "Tiendas", siembra: "tienda_barrio" },
  { id: "regalos", nombre: "Regalos y cotillón", grupo: "Tiendas", siembra: "tienda_barrio" },
  { id: "electronica", nombre: "Celulares y electrónica", grupo: "Tiendas", siembra: "tienda_barrio" },
  { id: "muebles", nombre: "Muebles y hogar", grupo: "Tiendas", siembra: "tienda_barrio" },
  { id: "artesanias", nombre: "Artesanías", grupo: "Tiendas", siembra: "tienda_barrio" },
  { id: "ropa_y_calzado", nombre: "Ropa y calzado", grupo: "Ropa", siembra: "ropa_y_calzado" },
  { id: "accesorios", nombre: "Accesorios y bisutería", grupo: "Ropa", siembra: "ropa_y_calzado" },
  { id: "ferreteria", nombre: "Ferretería y materiales", grupo: "Construcción", siembra: "ferreteria" },
  { id: "distribuidora", nombre: "Distribuidora", grupo: "Por mayor", siembra: "distribuidora" },
  { id: "repuestos", nombre: "Repuestos de auto y moto", grupo: "Vehículos", siembra: "repuestos" },
  { id: "taller_mecanico", nombre: "Taller mecánico", grupo: "Vehículos", siembra: "servicios" },
  { id: "barberia", nombre: "Barbería y peluquería", grupo: "Belleza", siembra: "belleza" },
  { id: "salon_belleza", nombre: "Salón de belleza y uñas", grupo: "Belleza", siembra: "belleza" },
  { id: "consultorio", nombre: "Consultorio", grupo: "Servicios", siembra: "servicios" },
  { id: "clases", nombre: "Clases y cursos", grupo: "Servicios", siembra: "servicios" },
  { id: "otros_servicios", nombre: "Otros servicios", grupo: "Servicios", siembra: "servicios" },
  { id: "veterinaria", nombre: "Veterinaria", grupo: "Mascotas", siembra: "veterinaria" },
  { id: "mascotas", nombre: "Tienda de mascotas", grupo: "Mascotas", siembra: "veterinaria" },
  { id: "otro", nombre: "Otro", grupo: "Otro", siembra: "otro" },
] as const satisfies ReadonlyArray<{
  id: string;
  nombre: string;
  grupo: GrupoRubroPublico;
  siembra: RubroId;
}>;

export type RubroPublicoId = (typeof RUBROS_PUBLICOS)[number]["id"];

/* El rubro público que corresponde a cada siembra cuando no hay otro dato: el
   de mismo nombre, o el más general de su grupo. Es lo que la migración de la
   fase 11 les puso a los negocios que ya existían, y lo que queda después de que
   la plataforma cambia la siembra. */
export const RUBRO_PUBLICO_POR_SIEMBRA: Record<RubroId, RubroPublicoId> = {
  restaurante: "restaurante",
  tienda_barrio: "tienda_barrio",
  ropa_y_calzado: "ropa_y_calzado",
  ferreteria: "ferreteria",
  servicios: "otros_servicios",
  belleza: "salon_belleza",
  distribuidora: "distribuidora",
  repuestos: "repuestos",
  veterinaria: "veterinaria",
  otro: "otro",
};

/* **El rubro se elige una vez.** Si el negocio ya tiene rubro público, el dueño
   no lo cambia: nos escribe y lo cambia la plataforma. Era así con la siembra
   desde la fase 8, y el dueño del proyecto pidió lo mismo para el rubro
   público. Quien nunca eligió —los negocios de antes del alta— elige una vez. */
export function rubroQuedoFijo(rubroPublicoActual: string | null | undefined): boolean {
  return Boolean(rubroPublicoActual);
}

export const MENSAJE_RUBRO_FIJO =
  "Tu rubro quedó fijo al crear tu catálogo. Para cambiarlo, escribinos por WhatsApp.";

/* Cuántos rubros más puede declarar, aparte del principal. Dos y no más: con
   más, todos marcan todo y el filtro deja de filtrar. */
export const MAXIMO_RUBROS_SECUNDARIOS = 2;

export function esRubroPublicoId(valor: unknown): valor is RubroPublicoId {
  return typeof valor === "string" && RUBROS_PUBLICOS.some(({ id }) => id === valor);
}

export function siembraDeRubroPublico(id: RubroPublicoId): RubroId {
  return RUBROS_PUBLICOS.find((rubro) => rubro.id === id)!.siembra;
}

export function nombreDeRubroPublico(id: unknown): string | null {
  return RUBROS_PUBLICOS.find((rubro) => rubro.id === id)?.nombre ?? null;
}

/* Los rubros agrupados, en el orden de los grupos, para el desplegable. */
export function rubrosPublicosPorGrupo() {
  return GRUPOS_RUBROS_PUBLICOS.map((grupo) => ({
    grupo,
    rubros: RUBROS_PUBLICOS.filter((rubro) => rubro.grupo === grupo),
  })).filter(({ rubros }) => rubros.length > 0);
}

/* Los secundarios, limpios: solo los que existen, sin el principal, sin
   repetidos y como mucho dos. Se usa para validar lo que manda el panel, que
   igual puede venir armado a mano. */
export function leerRubrosSecundarios(
  valor: unknown,
  principal: string | null,
): { correcto: true; secundarios: RubroPublicoId[] } | { correcto: false; error: string } {
  if (valor === undefined || valor === null) return { correcto: true, secundarios: [] };
  if (!Array.isArray(valor)) return { correcto: false, error: "Los rubros extra no son válidos." };

  const secundarios = [...new Set(valor)].filter((id) => id !== principal);
  if (!secundarios.every(esRubroPublicoId)) {
    return { correcto: false, error: "Uno de los rubros extra no existe." };
  }
  if (secundarios.length > MAXIMO_RUBROS_SECUNDARIOS) {
    return { correcto: false, error: `Podés sumar hasta ${MAXIMO_RUBROS_SECUNDARIOS} rubros extra.` };
  }
  return { correcto: true, secundarios };
}
