"use client";

import Link from "next/link";

import { registrarEventoAnalitica } from "../../lib/analitica-cliente";
import { construirRutaPedido } from "../../lib/catalogo/consulta-publica";
import { usePedido } from "../../lib/pedidos/use-pedido";
import type { ProductoPlantilla } from "../../lib/plantillas/tipos";
import { formatearPrecioBolivianos } from "../../lib/precios";
import { FichaProducto } from "./ficha-producto";
import styles from "./producto-con-pedido.module.css";

/* La página del producto, con el pedido del cliente adentro.
 *
 * Desde que tocar una tarjeta lleva acá en vez de abrir una hoja encima del
 * catálogo, esta página tiene que **poder vender**. Antes no podía: en un
 * negocio con carrito mostraba un enlace que decía «agrega desde el catálogo»,
 * que es pedirle al cliente que vuelva atrás para hacer lo que ya quería hacer.
 *
 * El pedido es el mismo de allá —`usarPedido` lee y escribe el mismo
 * almacén—, así que lo que se agrega acá está en el carrito al volver, y lo que
 * ya estaba en el carrito se ve acá en la cuenta del botón.
 */
export function ProductoConPedido({
  negocioId,
  producto,
  modalidad,
  permiteAcciones,
  slug,
}: {
  negocioId: string;
  producto: ProductoPlantilla;
  modalidad: "solo_lectura" | "accion_individual" | "carrito";
  permiteAcciones: boolean;
  slug: string;
}) {
  const { cantidades, elegidos, cambiarCantidad } = usePedido(negocioId);

  const articulos = Object.values(cantidades).reduce((total, unidades) => total + unidades, 0);
  const total = Object.entries(cantidades).reduce(
    (suma, [id, unidades]) => suma + (elegidos[id]?.precio ?? 0) * unidades,
    0,
  );

  return (
    <>
      <FichaProducto
        alAbrirWhatsapp={() => registrarEventoAnalitica(negocioId, "clic_whatsapp", producto.id)}
        alAgregarRenglon={(renglon) => {
          registrarEventoAnalitica(negocioId, "clic_producto", producto.id);
          cambiarCantidad(renglon, (cantidades[renglon.id] ?? 0) + 1);
        }}
        cantidadDe={(renglonId) => cantidades[renglonId] ?? 0}
        modalidad={modalidad}
        permiteAcciones={permiteAcciones}
        producto={producto}
        slug={slug}
      />

      {/* La barra de abajo aparece recién cuando hay algo que ver, y lleva al
          catálogo con el pedido ya abierto, que es donde se revisa y se manda.
          Antes llevaba al catálogo a secas y había que tocar otra vez. Es el mismo
          color de la paleta que el carrito de las tarjetas: lo que agrega y lo
          que abre el pedido son la misma cosa vista dos veces. */}
      {modalidad === "carrito" && articulos > 0 ? (
        <Link
          aria-label={`Ver pedido: ${articulos} ${articulos === 1 ? "artículo" : "artículos"}, subtotal ${formatearPrecioBolivianos(total)}`}
          className={styles.acceso}
          href={construirRutaPedido(slug)}
        >
          <span aria-hidden="true" className={styles.contador}>
            {articulos}
          </span>
          <span className={styles.texto}>
            <strong>Ver pedido</strong>
            <small>{formatearPrecioBolivianos(total)}</small>
          </span>
        </Link>
      ) : null}
    </>
  );
}
