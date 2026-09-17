import { formatearPrecioBolivianos } from "../../../lib/precios";
import { AccionProducto } from "../accion-producto";
import { EstadoStockProducto } from "../estado-stock-producto";
import { FotoProducto } from "../foto-producto";
import { InsigniaProducto, insigniaDe } from "../insignias-producto";
import { LineaAtributos } from "../linea-atributos";
import type { PropiedadesTarjeta } from "./tipos";
import styles from "./plantilla-mipuesto.module.css";

/* La tarjeta única del catálogo nuevo.
 *
 * Reemplaza a las seis formas anteriores. Lo que distinguía una ferretería de
 * una veterinaria no era la estructura de la tarjeta —eran los datos que
 * mostraba—, así que hay una sola forma y la `LineaAtributos` hace el resto:
 * «9 W · E27 · Cálida» debajo del nombre.
 *
 * Devuelve un `li`: el catálogo la lista dentro de un `ul` por categoría.
 */
export function TarjetaMipuesto({
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
    <li
      className={styles.tarjeta}
      data-agotado={producto.estado === "agotado" ? "si" : undefined}
      id={producto.anclaCategoria}
    >
      <FotoProducto
        alVerProducto={alVerProducto}
        ancho={640}
        className={styles.tarjetaFoto}
        insignias={<InsigniaProducto producto={producto} />}
        producto={producto}
        respaldo={<span className={styles.sinFoto} aria-hidden="true">Sin foto</span>}
        sizes="(min-width: 64rem) 240px, (min-width: 40rem) 30vw, 45vw"
      />

      <div className={styles.tarjetaCuerpo}>
        <h4 className={styles.tarjetaNombre}>{producto.nombre}</h4>
        {producto.descripcion ? (
          <p className={styles.tarjetaDescripcion}>{producto.descripcion}</p>
        ) : null}

        {/* Los datos propios de su categoría, en una línea. Es lo que hace que
            cada rubro se vea distinto sin cambiar una regla de estilo. */}
        <LineaAtributos linea={producto.lineaAtributos} />

        {/* La pastilla sobre la foto ya dice si está agotado o reservado; no se
            repite el estado debajo cuando esa pastilla está. */}
        {insigniaDe(producto) === null ? (
          <EstadoStockProducto className={styles.tarjetaStock} producto={producto} />
        ) : null}

        <div className={styles.tarjetaPie}>
          <div className={styles.tarjetaPrecio}>
            {producto.tienePromocion ? (
              <s>{formatearPrecioBolivianos(producto.precioOriginal)}</s>
            ) : null}
            <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
          </div>
          <AccionProducto
            alAgregarProducto={alAgregarProducto}
            alAbrirWhatsapp={alAbrirWhatsapp}
            alVerProducto={alVerProducto}
            cantidad={cantidadEnCarrito}
            demostracion={demostracion}
            modalidad={modalidad}
            permiteAcciones={permiteAcciones}
            /* Solo el ícono: al lado del precio no entra una frase. La ficha,
               que tiene la pantalla entera, la usa con palabras. */
            presentacion="icono"
            producto={producto}
          />
        </div>
      </div>
    </li>
  );
}
