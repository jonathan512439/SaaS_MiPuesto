import { tituloSinUnidad } from "./datos-de-planilla";
import { esColumnaInterna } from "./diseno-de-categoria";

/* Los datos de un producto que no tienen campo, escritos en su descripción.
 *
 * Una categoría admite diez campos (`MAXIMO_ATRIBUTOS`). El catálogo de
 * Ferrovolt trae fichas con hasta 28 datos distintos por familia, y con el tope
 * se perdían 97 de 964 datos en 51 productos, sin aviso: la «Potencia de motor»
 * de un variador o el «Grado de protección» de un toma. Pasa lo mismo cuando el
 * dueño manda una sección a una categoría que ya tenía y que no trae ese campo.
 *
 * Así no se pierde nada: lo que no entra como campo va al final de la
 * descripción, como «Potencia de motor: 5,5 kW · Posiciones: 3», que el
 * cliente lee igual. Lo interno —costo, código, proveedor— nunca: la
 * descripción es pública (`esColumnaInterna`).
 *
 * Vale para la planilla y para la lectura con IA, que pasan por la misma
 * revisión. */

/* El mismo tope que valida la ruta de productos (`lib/catalogo/validacion.ts`):
   pasarlo haría que la ruta rechace el producto entero. */
export const LARGO_MAXIMO_DESCRIPCION = 1000;

const SEPARADOR = " · ";

export type DatoSinCampo = { titulo: string; valor: string };

export function datosALaDescripcion(
  descripcion: string,
  datos: readonly DatoSinCampo[],
  largoMaximo: number = LARGO_MAXIMO_DESCRIPCION,
): { descripcion: string; agregados: number; sinLugar: number } {
  const base = descripcion.trim();
  const vistos = new Set<string>();
  const renglones: string[] = [];
  for (const { titulo, valor } of datos) {
    const nombre = titulo.trim();
    const escrito = valor.trim().replace(/\.$/, "");
    const llave = tituloSinUnidad(nombre);
    if (!nombre || !escrito || esColumnaInterna(nombre) || vistos.has(llave)) continue;
    vistos.add(llave);
    const renglon = `${nombre}: ${escrito}`;
    /* Si ya está escrito —una segunda importación del mismo archivo, o el dueño
       lo copió a mano—, no se repite. */
    if (base.includes(renglon)) continue;
    renglones.push(renglon);
  }

  let agregado = "";
  let agregados = 0;
  for (const renglon of renglones) {
    const siguiente = agregado ? `${agregado}${SEPARADOR}${renglon}` : renglon;
    const total = base ? `${base}\n\n${siguiente}` : siguiente;
    if (total.length > largoMaximo) break;
    agregado = siguiente;
    agregados += 1;
  }

  return {
    descripcion: agregado ? (base ? `${base}\n\n${agregado}` : agregado) : base,
    agregados,
    sinLugar: renglones.length - agregados,
  };
}
