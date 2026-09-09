import { formatearPrecioBolivianos } from "../../../lib/precios";
import { AccionProducto } from "../accion-producto";
import { EstadoStockProducto } from "../estado-stock-producto";
import { FotoProducto } from "../foto-producto";
import { InsigniaProducto, insigniaDe } from "../insignias-producto";
import type { PropiedadesTarjeta } from "./tipos";
/* La hoja sigue siendo la de Moderna, y eso es deliberado.
 *
 * Este componente sale de adentro de esa plantilla y su CSS está entrelazado con
 * el del armazón: `.detalle` comparte una regla con `.presentacion`, otra con la
 * navegación y el pie, y aparece dentro de tres consultas de medios. Separarlo
 * de verdad es cirugía sobre quinientas líneas cuyo único resultado esperado es
 * que nada cambie — el peor negocio posible: todo el riesgo, ningún beneficio
 * visible.
 *
 * Moviendo solo el JSX, la separación estructural es real —la plantilla ya no
 * sabe cómo se dibuja un producto— y el aspecto es idéntico por construcción,
 * porque son literalmente las mismas clases. La hoja se puede independizar
 * después, cuando haya un motivo mejor que la prolijidad. */
import styles from "../moderna/plantilla-moderna.module.css";

export function TarjetaCuadricula({
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
        className={styles.imagen}
        insignias={<InsigniaProducto producto={producto} />}
        producto={producto}
        respaldo={<span className={styles.sinImagen}>Sin foto</span>}
        sizes="(min-width: 64rem) 260px, (min-width: 48rem) 30vw, 50vw"
      />
      <div className={styles.detalle}>
        <p>
          {producto.subcategoria
            ? `${producto.categoria} / ${producto.subcategoria}`
            : producto.categoria}
        </p>
        <h4>{producto.nombre}</h4>
        <span>{producto.descripcion}</span>
        <div className={styles.precio}>
          {producto.tienePromocion ? (
            <s>{formatearPrecioBolivianos(producto.precioOriginal)}</s>
          ) : null}
          <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
          {producto.tienePromocion ? <small>Precio promocional</small> : null}
        </div>
        {/* Lo que ya dijo la pastilla sobre la foto no se repite debajo del
            nombre: la misma frase dos veces en una tarjeta chica ocupa el lugar
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
    </li>
  );
}
