import type { ProductoPlantilla } from "../../lib/plantillas/tipos";

type PropiedadesEstadoStock = {
  producto: ProductoPlantilla;
  className?: string;
};

export function EstadoStockProducto({ producto, className }: PropiedadesEstadoStock) {
  if (!producto.controlaStock || producto.cantidadDisponible === null) return null;

  const texto =
    producto.cantidadDisponible === 0
      ? "Sin unidades disponibles"
      : producto.cantidadDisponible === 1
        ? "Queda 1 unidad"
        : `Quedan ${producto.cantidadDisponible} unidades`;

  return <span className={className}>{texto}</span>;
}
