import { COSMETICOS } from "./cosmeticos";
import { DISTRIBUIDORA } from "./distribuidora";
import { FERRETERIA } from "./ferreteria";
import { MOCHILAS } from "./mochilas";
import { REPUESTOS } from "./repuestos";
import { RESTAURANTE } from "./restaurante";
import { ROPA_Y_CALZADO } from "./ropa-y-calzado";
import { VETERINARIA } from "./veterinaria";
import type { SiembraDeRubro } from "./tipos";

export type { SiembraDeRubro, CategoriaSembrada, AtributoSembrado } from "./tipos";

/* Las seis siembras del MVP, y las que se suman cuando llega el primer cliente
 * de un rubro que no estaba: mochilas y cosméticos, en octubre de 2026.
 *
 * Los otros cuatro rubros —tienda de barrio, servicios, belleza y «otro»— no
 * tienen siembra **a propósito**: se les arma cuando llegue el primer cliente de
 * ese rubro, no antes. Inventarle categorías a una peluquería que no existe es
 * adivinar, y adivinar mal le deja al dueño un catálogo que tiene que borrar
 * antes de empezar.
 *
 * Elegir uno de esos cuatro sigue funcionando como siempre: sin siembra, con el
 * catálogo en blanco. */
export const SIEMBRAS: ReadonlyArray<SiembraDeRubro> = [
  RESTAURANTE,
  FERRETERIA,
  ROPA_Y_CALZADO,
  DISTRIBUIDORA,
  REPUESTOS,
  VETERINARIA,
  MOCHILAS,
  COSMETICOS,
];

export function siembraDeRubro(rubro: unknown): SiembraDeRubro | null {
  return SIEMBRAS.find(({ rubro: id }) => id === rubro) ?? null;
}
