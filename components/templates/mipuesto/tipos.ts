import type { FormaTarjeta } from "../../../lib/apariencia";
import type { ModoAccionCatalogo } from "../../../lib/modalidades";
import type { ProductoPlantilla } from "../../../lib/plantillas/tipos";

/* El producto tal como llega a la tarjeta.
 *
 * Es el de la plantilla más el rastro de dónde está: la plantilla aplana sus
 * categorías para dibujar la lista y, al hacerlo, pierde el árbol.
 *
 * **`subcategoria` hoy llega y no se dibuja**, y se deja a propósito. Las seis
 * tarjetas anteriores la escribían en una línea sobre el nombre; la tarjeta
 * única de la fase 6 no heredó esa línea, así que quien crea «Bebidas →
 * Gaseosas» en el panel no ve la subcategoría en ninguna parte del catálogo.
 *
 * Se resuelve en la fase 9 **agrupando**, no rotulando: una subcategoría es
 * dónde vive el producto, y como etiqueta al costado quedaría indistinguible de
 * un campo de categoría. Va con la carga al desplazar porque las dos
 * reestructuran esta misma lista. Está anotado en `docs/plan/06-FASES.md`.
 *
 * El ancla es para que la barra de categorías tenga a dónde saltar. */
export type ProductoEnTarjeta = ProductoPlantilla & {
  categoria: string;
  subcategoria: string | null;
  anclaCategoria?: string;
};

/* Todo lo que la tarjeta necesita, y nada más.
 *
 * En particular **no recibe `datos`**: una tarjeta que puede leer el negocio
 * entero termina leyéndolo, y ahí deja de ser una pieza para pasar a ser un
 * pedazo de plantilla. Lo que necesita del negocio —la modalidad y si se puede
 * accionar ahora— llega desarmado. */
export type PropiedadesTarjeta = {
  producto: ProductoEnTarjeta;
  /* El negocio al que pertenece, para armar el enlace a la página del producto.
     Va en `null` en las vistas previas —la portada, el selector de apariencia,
     el paso del alta—: ahí los productos son de mentira y un enlace llevaría a
     una página que no existe. Sin él la tarjeta no enlaza, y no falla. */
  slug: string | null;
  /* Cómo se dibuja. Cambia la disposición y si hay foto; nunca qué se puede
     hacer con el producto, que lo sigue diciendo `modalidad`. */
  forma: FormaTarjeta;
  modalidad: ModoAccionCatalogo;
  permiteAcciones: boolean;
  demostracion: boolean;
  cantidadEnCarrito?: number;
  alAgregarProducto?: (productoId: string) => void;
  alAbrirWhatsapp?: (productoId: string | null) => void;
  alVerProducto?: (productoId: string) => void;
};
