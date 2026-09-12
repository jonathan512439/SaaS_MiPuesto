import { formatearPrecioBolivianos } from "../../../lib/precios";
import { AccionProducto } from "../accion-producto";
import { EstadoStockProducto } from "../estado-stock-producto";
import { FotoProducto } from "../foto-producto";
import { InsigniaProducto, insigniaDe } from "../insignias-producto";
import styles from "./formas-nuevas.module.css";
import type { PropiedadesTarjeta } from "./tipos";
import { LineaAtributos } from "../linea-atributos";

/* Retrato y estadía: las dos formas que no salen de ninguna plantilla.
 *
 * Comparten archivo porque comparten todo menos la proporción de la fotografía,
 * y separarlas en dos daría dos lugares donde arreglar el mismo error. La
 * proporción la pone una clase, que es la única diferencia real.
 *
 * A diferencia de las cuatro heredadas, estas tienen hoja propia y solo usan
 * tokens del tema: funcionan dentro de cualquier armazón y con las siete
 * paletas, sin una línea por combinación.
 */
function TarjetaConFoto({
  forma,
  producto,
  modalidad,
  permiteAcciones,
  demostracion,
  cantidadEnCarrito,
  alAgregarProducto,
  alAbrirWhatsapp,
  alVerProducto,
}: PropiedadesTarjeta & { forma: "retrato" | "estadia" }) {
  return (
    <li className={`${styles.tarjeta} ${styles[forma]}`} id={producto.anclaCategoria}>
      <FotoProducto
        alVerProducto={alVerProducto}
        ancho={800}
        className={styles.foto}
        insignias={<InsigniaProducto producto={producto} />}
        producto={producto}
        respaldo={<span className={styles.sinFoto}>Sin foto</span>}
        sizes="(min-width: 64rem) 300px, (min-width: 48rem) 33vw, 50vw"
      />
      <div className={styles.detalle}>
        <p className={styles.rubro}>
          {producto.subcategoria
            ? `${producto.categoria} / ${producto.subcategoria}`
            : producto.categoria}
        </p>
        <h4 className={styles.nombre}>{producto.nombre}</h4>
        <p className={styles.descripcion}>{producto.descripcion}</p>
        <LineaAtributos linea={producto.lineaAtributos} />
        <div className={styles.precio}>
          {producto.tienePromocion ? (
            <s>{formatearPrecioBolivianos(producto.precioOriginal)}</s>
          ) : null}
          <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
          {producto.tienePromocion ? <small>Precio promocional</small> : null}
        </div>
        {/* Misma regla que en las heredadas: lo que ya dijo la pastilla sobre la
            foto no se repite debajo del nombre. */}
        {insigniaDe(producto) === null ? (
          <EstadoStockProducto className={styles.stock} producto={producto} />
        ) : null}
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

export function TarjetaRetrato(propiedades: PropiedadesTarjeta) {
  return <TarjetaConFoto forma="retrato" {...propiedades} />;
}

export function TarjetaEstadia(propiedades: PropiedadesTarjeta) {
  return <TarjetaConFoto forma="estadia" {...propiedades} />;
}
