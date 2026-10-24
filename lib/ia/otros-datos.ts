import { LARGO_NOMBRE } from "../catalogo/atributos";
import { LARGO_VALOR_TEXTO } from "../catalogo/valores";
import { esColumnaInterna } from "../importacion/diseno-de-categoria";

/* Lo que un renglón trae escrito además del nombre y el precio —«Color: azul»,
 * «25 litros», «de cuero»— y que no es un campo de la categoría del negocio.
 *
 * Se devuelve con la misma forma que las columnas de una planilla —el título y
 * lo escrito—, porque de ahí en adelante es lo mismo: la revisión lo cruza con
 * los campos de la categoría de destino por el nombre, y si la categoría es
 * nueva, nace con un campo por cada dato (`diseno-de-categoria.ts`).
 *
 * Se limpia como todo lo que contesta el modelo: sin vacíos ni repetidos, con
 * los largos que acepta la base, hasta diez por renglón, y nunca un costo, un
 * código o un precio, que terminarían a la vista del cliente. */
export const MAXIMO_OTROS_DATOS = 10;

export function camposDeOtrosDatos(crudos: unknown): Record<string, string> {
  if (!Array.isArray(crudos)) return {};
  const campos: Record<string, string> = {};
  const vistos = new Set<string>();
  for (const crudo of crudos as Array<{ nombre?: unknown; valor?: unknown }>) {
    const nombre = String(crudo?.nombre ?? "").replace(/\s+/g, " ").trim().slice(0, LARGO_NOMBRE);
    const valor = String(crudo?.valor ?? "").replace(/\s+/g, " ").trim().slice(0, LARGO_VALOR_TEXTO);
    const llave = nombre.toLowerCase();
    if (!nombre || !valor || vistos.has(llave) || esColumnaInterna(nombre)) continue;
    vistos.add(llave);
    campos[nombre] = valor;
    if (vistos.size === MAXIMO_OTROS_DATOS) break;
  }
  return campos;
}
