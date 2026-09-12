import { formatearPrecioBolivianos } from "../../../lib/precios";
import { AccionProducto } from "../accion-producto";
import { EstadoStockProducto } from "../estado-stock-producto";
/* La hoja sigue siendo la de Feria. Mismo motivo que en `cuadricula.tsx`. */
import styles from "../feria/plantilla-feria.module.css";
import { FotoProducto } from "../foto-producto";
import type { PropiedadesTarjeta } from "./tipos";
import { LineaAtributos } from "../linea-atributos";

/* La fila compacta: foto chica, nombre, precio grande y la acción en su propia
 * columna. Sin descripción, a propósito — en una lista de precios larga, dos
 * líneas de texto por producto la vuelven ilegible.
 *
 * **Es la que va a recibir los dos atributos destacados de la fase 2.** Una
 * ferretería necesita ver «100 W» y «E27» junto al precio, y este es el único
 * formato donde eso entra sin empujar nada: la columna del medio tiene lugar y
 * hoy está a medio usar. Hasta entonces no se dibuja un hueco reservado. */
export function TarjetaFicha({
  producto,
  modalidad,
  permiteAcciones,
  demostracion,
  cantidadEnCarrito,
  alAgregarProducto,
  alAbrirWhatsapp,
  alVerProducto,
}: PropiedadesTarjeta) {
  return (
    <li className={styles.producto} id={producto.anclaCategoria}>
      <div className={styles.foto}>
        <FotoProducto
          alVerProducto={alVerProducto}
          ancho={240}
          className={styles.imagen}
          producto={producto}
          respaldo={
            <span className={styles.sinImagen} aria-hidden="true">
              ·
            </span>
          }
          sizes="96px"
        />
      </div>

      <div className={styles.info}>
        <h4>{producto.nombre}</h4>
        <p className={styles.rubro}>
          {producto.subcategoria
            ? `${producto.categoria} / ${producto.subcategoria}`
            : producto.categoria}
        </p>
        <LineaAtributos linea={producto.lineaAtributos} />
        {producto.estado === "agotado" ? (
          <span className={styles.agotado}>Agotado</span>
        ) : null}
        <EstadoStockProducto className={styles.stock} producto={producto} />
      </div>

      <div className={styles.precio}>
        {producto.tienePromocion ? (
          <s>{formatearPrecioBolivianos(producto.precioOriginal)}</s>
        ) : null}
        <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
        {producto.tienePromocion ? <small>Oferta</small> : null}
      </div>

      <div className={styles.accion}>
        <AccionProducto
          alAgregarProducto={alAgregarProducto}
          alAbrirWhatsapp={alAbrirWhatsapp}
          alVerProducto={alVerProducto}
          cantidad={cantidadEnCarrito}
          demostracion={demostracion}
          modalidad={modalidad}
          permiteAcciones={permiteAcciones}
          producto={producto}
        />
      </div>
    </li>
  );
}
