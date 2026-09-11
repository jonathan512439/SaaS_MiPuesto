import { formatearPrecioBolivianos } from "../../../lib/precios";
import { AccionProducto } from "../accion-producto";
import { EstadoStockProducto } from "../estado-stock-producto";
import { FotoProducto } from "../foto-producto";
/* La hoja sigue siendo la de Mínima. Mismo motivo que en `cuadricula.tsx`. */
import styles from "../minimal/plantilla-minimal.module.css";
import type { PropiedadesTarjeta } from "./tipos";
import { LineaAtributos } from "../linea-atributos";

/* El servicio: foto chica, nombre, qué incluye y el precio, sin vitrina.
 *
 * **Devuelve un `div` con `dt` y `dd`, no un `li`.** Mínima lista servicios
 * dentro de un `dl`, que es la etiqueta correcta para un par nombre-descripción,
 * y nueve reglas de su hoja dependen de eso. Por eso esta tarjeta es la única
 * que Mínima admite: las demás devuelven `li`, y un `li` dentro de un `dl` es
 * HTML inválido.
 *
 * Es una restricción real, no un olvido, y está anotada en el registro de
 * apariencia junto a la lista de Mínima.
 */
export function TarjetaServicio({
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
    <div className={styles.servicio}>
      <FotoProducto
        alVerProducto={alVerProducto}
        ancho={800}
        producto={producto}
        respaldo={<span className={styles.sinImagen}>Sin foto</span>}
        sizes="64px"
      />
      <dt>
        {producto.subcategoria ? (
          <span className={styles.subcategoria}>{producto.subcategoria}</span>
        ) : null}
        {producto.nombre}
      </dt>
      <dd>{producto.descripcion}</dd>
      <dd>
        <LineaAtributos linea={producto.lineaAtributos} />
      </dd>
      <dd className={styles.precio}>
        {producto.tienePromocion ? (
          <s>{formatearPrecioBolivianos(producto.precioOriginal)}</s>
        ) : null}
        <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
        {producto.tienePromocion ? <small>Oferta vigente</small> : null}
      </dd>
      {producto.estado === "agotado" ? (
        <dd>
          <span className={styles.agotado}>Agotado</span>
        </dd>
      ) : null}
      {producto.controlaStock ? (
        <dd>
          <EstadoStockProducto className={styles.stock} producto={producto} />
        </dd>
      ) : null}
      {/* Un catálogo de solo lectura no ofrece ninguna acción, y acá eso se nota
          más que en otras plantillas: sin este condicional quedaría un `dd`
          vacío al final de cada servicio. */}
      {modalidad !== "solo_lectura" ? (
        <dd>
          <AccionProducto
            alAgregarProducto={alAgregarProducto}
            alAbrirWhatsapp={alAbrirWhatsapp}
            cantidad={cantidadEnCarrito}
            demostracion={demostracion}
            modalidad={modalidad}
            permiteAcciones={permiteAcciones}
            producto={producto}
          />
        </dd>
      ) : null}
    </div>
  );
}
