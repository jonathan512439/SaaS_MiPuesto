import { nombreConPresentacion } from "../catalogo/variantes";
import type { ProductoPlantilla } from "../plantillas/tipos";

/* El renglón del carrito para una presentación elegida.
 *
 * El carrito guarda productos por su `id`. Con presentaciones, la M y la L del
 * mismo producto tienen que ser dos renglones, así que el renglón es una copia
 * del producto con:
 *
 * - su propio `id` —producto y presentación juntos—;
 * - el nombre con la presentación: «Remera lisa (Talla M)»;
 * - el precio de la presentación, y el máximo de lo que queda de ella;
 * - `seleccion`, que es lo que viaja al servidor: el producto y la presentación
 *   por separado. El precio no viaja nunca: lo pone la base.
 *
 * Hecho así, el resto del carrito —sumar, restar, el total, la firma de la
 * selección— no tuvo que cambiar, y un carrito guardado de antes de la fase 13
 * sigue abriendo igual: sus renglones no tienen `seleccion` y son el producto.
 */
export const SEPARADOR_DE_RENGLON = ":";

export function idDeRenglon(productoId: string, varianteId: string): string {
  return `${productoId}${SEPARADOR_DE_RENGLON}${varianteId}`;
}

export function renglonDePresentacion(
  producto: ProductoPlantilla,
  varianteId: string,
): ProductoPlantilla | null {
  const variante = producto.variantes.find(({ id }) => id === varianteId);
  if (!variante) return null;

  const disponibles = variante.disponibles ?? null;
  return {
    ...producto,
    id: idDeRenglon(producto.id, variante.id),
    nombre: nombreConPresentacion(producto.nombre, producto.tipoPresentacion, variante.nombre),
    precio: variante.precio,
    /* El precio tachado solo tiene sentido si la presentación cobra el del
       producto con su promoción; con precio propio, no hay nada que tachar. */
    precioOriginal: producto.tienePromocion && variante.precio === producto.precio
      ? producto.precioOriginal
      : variante.precio,
    tienePromocion: producto.tienePromocion && variante.precio === producto.precio,
    cantidadDisponible: disponibles,
    maximoCantidad: disponibles === null ? 99 : Math.min(99, disponibles),
    estado: disponibles === 0 ? "agotado" : producto.estado,
    accionWhatsapp: variante.accionWhatsapp,
    variantes: [],
    seleccion: { productoId: producto.id, varianteId: variante.id },
  };
}

/* Lo que se manda al servidor por cada renglón del carrito. */
export function itemDeRenglon(producto: ProductoPlantilla, cantidad: number) {
  return {
    productoId: producto.seleccion?.productoId ?? producto.id,
    varianteId: producto.seleccion?.varianteId ?? null,
    cantidad,
  };
}
