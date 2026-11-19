import type { ProductoPlantilla } from "../plantillas/tipos";
import { tienePrecio } from "../precios";

/* Los renglones del pedido que tienen que salir porque su producto ya no tiene
 * precio (fase 14).
 *
 * El pedido guarda su propia copia de cada producto en la sesión del teléfono,
 * con el precio que tenía al agregarlo. Si el dueño le quitó el precio después,
 * la copia sigue diciendo «Bs 30» y la base rechazaría el pedido entero con
 * `PRODUCTO_SIN_PRECIO`. Antes de llegar a eso, el catálogo compara lo guardado
 * con lo que acaba de llegar del servidor y saca lo que ya no se pide.
 *
 * Mira el producto del renglón y no el renglón: la talla M de una remera es el
 * renglón «p1:v40», y lo que decide es si la remera tiene precio (decisión 4).
 * Una copia guardada sin precio también sale, venga de donde venga. */
export function renglonesQueSalenDelPedido(
  cantidades: Readonly<Record<string, number>>,
  elegidos: Readonly<Record<string, ProductoPlantilla>>,
  frescos: ReadonlyArray<ProductoPlantilla>,
): ProductoPlantilla[] {
  const sinPrecio = new Set(
    frescos.filter((producto) => !tienePrecio(producto.precio)).map(({ id }) => id),
  );
  return Object.keys(cantidades).flatMap((id) => {
    const renglon = elegidos[id];
    if (!renglon) return [];
    const productoId = renglon.seleccion?.productoId ?? renglon.id;
    return sinPrecio.has(productoId) || !tienePrecio(renglon.precio) ? [renglon] : [];
  });
}

/* El aviso del carrito cuando algo salió. **No habla de precio**, como todo lo
   que ve el cliente: dice qué pasó y qué puede hacer. */
export function avisoDeRenglonesQueSalieron(nombres: ReadonlyArray<string>): string | null {
  if (nombres.length === 0) return null;
  if (nombres.length === 1) {
    return `«${nombres[0]}» salió de tu pedido: ahora se consulta por WhatsApp desde el catálogo.`;
  }
  return `${nombres.length} productos salieron de tu pedido: ahora se consultan por WhatsApp desde el catálogo.`;
}
