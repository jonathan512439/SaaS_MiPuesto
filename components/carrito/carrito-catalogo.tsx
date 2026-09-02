"use client";

import type { PaletaId } from "../../lib/apariencia";
import { calcularSubtotal, formatearPrecioBolivianos } from "../../lib/precios";
import type { DatosPlantilla, ProductoPlantilla } from "../../lib/plantillas/tipos";
import { construirEnlaceWhatsapp, construirMensajePedido } from "../../lib/whatsapp";
import temaStyles from "../templates/tema-catalogo.module.css";
import styles from "./carrito-catalogo.module.css";

type PropiedadesCarrito = {
  datos: DatosPlantilla;
  productos: ProductoPlantilla[];
  cantidades: Record<string, number>;
  paleta: PaletaId;
  onCambiarCantidad: (productoId: string, cantidad: number) => void;
};

export function CarritoCatalogo({
  datos,
  productos,
  cantidades,
  paleta,
  onCambiarCantidad,
}: PropiedadesCarrito) {
  const items = productos
    .map((producto) => ({ producto, cantidad: cantidades[producto.id] ?? 0 }))
    .filter(({ cantidad }) => cantidad > 0);
  const subtotal = calcularSubtotal(
    items.map(({ producto, cantidad }) => ({ precio: producto.precio, cantidad })),
  );
  const mensaje = construirMensajePedido(
    datos.negocio.nombre,
    items.map(({ producto, cantidad }) => ({
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad,
    })),
  );
  const enlace = construirEnlaceWhatsapp(datos.negocio.telefonoWhatsapp, mensaje);
  const puedeConfirmar = datos.negocio.atencion.permiteAcciones && enlace;

  return (
    <section
      aria-labelledby="titulo-carrito"
      className={`${temaStyles.tema} ${styles.carrito}`}
      data-paleta={paleta}
    >
      <header>
        <div>
          <p>Tu selección</p>
          <h2 id="titulo-carrito">Pedido por WhatsApp</h2>
        </div>
        <strong>{items.length === 1 ? "1 producto" : `${items.length} productos`}</strong>
      </header>

      {items.length === 0 ? (
        <p className={styles.vacio}>
          Todavía no agregaste productos. Elige una opción del catálogo para preparar tu pedido.
        </p>
      ) : (
        <ul aria-live="polite">
          {items.map(({ producto, cantidad }) => (
            <li key={producto.id}>
              <div className={styles.detalle}>
                <strong>{producto.nombre}</strong>
                <span>{formatearPrecioBolivianos(producto.precio)} cada uno</span>
              </div>
              <div className={styles.cantidad} aria-label={`Cantidad de ${producto.nombre}`}>
                <button
                  aria-label={`Disminuir cantidad de ${producto.nombre}`}
                  onClick={() => onCambiarCantidad(producto.id, cantidad - 1)}
                  type="button"
                >
                  −
                </button>
                <span>{cantidad}</span>
                <button
                  aria-label={`Aumentar cantidad de ${producto.nombre}`}
                  disabled={cantidad >= 99}
                  onClick={() => onCambiarCantidad(producto.id, cantidad + 1)}
                  type="button"
                >
                  +
                </button>
              </div>
              <strong className={styles.totalItem}>
                {formatearPrecioBolivianos(
                  calcularSubtotal([{ precio: producto.precio, cantidad }]),
                )}
              </strong>
              <button
                className={styles.quitar}
                onClick={() => onCambiarCantidad(producto.id, 0)}
                type="button"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer>
        <div>
          <span>Subtotal publicado</span>
          <strong>{formatearPrecioBolivianos(subtotal)}</strong>
        </div>
        {puedeConfirmar ? (
          <a href={enlace} rel="noreferrer" target="_blank">
            Continuar por WhatsApp
          </a>
        ) : (
          <button disabled type="button">
            Continuar por WhatsApp
          </button>
        )}
      </footer>
      {items.length > 0 && !datos.negocio.atencion.permiteAcciones ? (
        <p className={styles.restriccion}>
          Podrás enviar este pedido cuando el negocio vuelva a su horario de atención.
        </p>
      ) : null}
    </section>
  );
}
