import type { ModoAccionCatalogo } from "../../../lib/modalidades";
import type { ProductoPlantilla } from "../../../lib/plantillas/tipos";

/* El producto tal como llega a una tarjeta.
 *
 * Es el de la plantilla más el rastro de dónde está: cada plantilla aplana sus
 * categorías para dibujar la lista y, al hacerlo, pierde el árbol. La tarjeta
 * necesita esos dos nombres para dibujar la línea de arriba, y el ancla para que
 * la barra de categorías tenga a dónde saltar. */
export type ProductoEnTarjeta = ProductoPlantilla & {
  categoria: string;
  subcategoria: string | null;
  anclaCategoria?: string;
};

/* Todo lo que una tarjeta necesita, y nada más.
 *
 * En particular **no recibe `datos`**: una tarjeta que puede leer el negocio
 * entero termina leyéndolo, y ahí deja de ser una pieza para pasar a ser un
 * pedazo de plantilla. Lo que necesita del negocio —la modalidad y si se puede
 * accionar ahora— llega desarmado. */
export type PropiedadesTarjeta = {
  producto: ProductoEnTarjeta;
  modalidad: ModoAccionCatalogo;
  permiteAcciones: boolean;
  demostracion: boolean;
  cantidadEnCarrito?: number;
  alAgregarProducto?: (productoId: string) => void;
  alAbrirWhatsapp?: (productoId: string | null) => void;
  alVerProducto?: (productoId: string) => void;
};
