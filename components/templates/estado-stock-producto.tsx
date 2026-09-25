import type { ProductoPlantilla } from "../../lib/plantillas/tipos";

type PropiedadesEstadoStock = {
  producto: ProductoPlantilla;
  className?: string;
};

/* Con presentaciones se calla el total: la ficha decía «Quedan 25 unidades»
   arriba y «38 · Quedan 3» en el selector, y 25 no se pueden pedir de ninguna
   talla. Cada presentación dice lo suyo al elegirla. Que no quede ninguna sí se
   dice, porque es cierto para todas. */
export function textoDeExistencias(producto: ProductoPlantilla): string | null {
  if (!producto.controlaStock || producto.cantidadDisponible === null) return null;
  if (producto.cantidadDisponible === 0) return "Sin unidades disponibles";
  if (producto.variantes.length > 0) return null;
  return producto.cantidadDisponible === 1
    ? "Queda 1 unidad"
    : `Quedan ${producto.cantidadDisponible} unidades`;
}

export function EstadoStockProducto({ producto, className }: PropiedadesEstadoStock) {
  const texto = textoDeExistencias(producto);
  if (!texto) return null;
  return <span className={className}>{texto}</span>;
}
