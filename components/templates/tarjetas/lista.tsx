import { formatearPrecioBolivianos } from "../../../lib/precios";
import { AccionProducto } from "../accion-producto";
/* La hoja sigue siendo la de Clásica, por el mismo motivo que la de Moderna:
   separar el CSS no cambiaría nada de lo que se ve y arriesgaría todo. Está
   explicado entero en `cuadricula.tsx`. */
import styles from "../clasica/plantilla-clasica.module.css";
import { EstadoStockProducto } from "../estado-stock-producto";
import { FotoProducto } from "../foto-producto";
import { InsigniaProducto, insigniaDe } from "../insignias-producto";
import type { PropiedadesTarjeta } from "./tipos";
import { LineaAtributos } from "../linea-atributos";

/* La fila editorial: foto, texto con la acción adentro, y el precio al costado.
 *
 * Se distingue de `ficha` en dos cosas que se ven: lleva descripción y la acción
 * va dentro del bloque de texto en vez de en su propia columna. Eso la hace más
 * alta y más pausada, que es lo que quiere una carta de restaurante y lo que
 * estorba en una lista de precios de ferretería. */
export function TarjetaLista({
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
      <FotoProducto
        alVerProducto={alVerProducto}
        ancho={800}
        insignias={<InsigniaProducto producto={producto} />}
        producto={producto}
        respaldo={<span className={styles.sinImagen}>Sin foto</span>}
        sizes="(min-width: 64rem) 260px, (min-width: 48rem) 30vw, 50vw"
      />
      <div>
        {producto.subcategoria ? (
          <span className={styles.subcategoria}>{producto.subcategoria}</span>
        ) : null}
        <h5>{producto.nombre}</h5>
        <p>{producto.descripcion}</p>
        <LineaAtributos linea={producto.lineaAtributos} />
        {/* Lo que ya dijo la pastilla sobre la foto no se repite debajo del
            nombre: en una tarjeta chica, la misma frase dos veces ocupa el lugar
            de la descripción. */}
        {insigniaDe(producto) === null ? (
          <EstadoStockProducto className={styles.stock} producto={producto} />
        ) : null}
        <AccionProducto
          alAgregarProducto={alAgregarProducto}
          alAbrirWhatsapp={alAbrirWhatsapp}
          cantidad={cantidadEnCarrito}
          demostracion={demostracion}
          modalidad={modalidad}
          permiteAcciones={permiteAcciones}
          producto={producto}
        />
      </div>
      <div className={styles.precio}>
        {producto.tienePromocion ? (
          <s>{formatearPrecioBolivianos(producto.precioOriginal)}</s>
        ) : null}
        <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
      </div>
    </li>
  );
}
