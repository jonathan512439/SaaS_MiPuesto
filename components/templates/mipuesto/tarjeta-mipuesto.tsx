import Link from "next/link";

import { formatearPrecioBolivianos } from "../../../lib/precios";
import { IconoCatalogo } from "../../iconos/icono-catalogo";
import { rutaProductoPublico } from "../../../lib/url-sitio";
import { AccionProducto } from "../accion-producto";
import { EstadoStockProducto } from "../estado-stock-producto";
import { FotoProducto } from "../foto-producto";
import { InsigniaProducto, insigniaDe } from "../insignias-producto";
import { LineaAtributos } from "../linea-atributos";
import type { PropiedadesTarjeta } from "./tipos";
import styles from "./plantilla-mipuesto.module.css";

/* La tarjeta del catálogo, en sus tres formas.
 *
 * Reemplazó a las seis formas anteriores, que eran seis componentes. Desde la
 * fase 10 vuelve a haber formas, pero **es un solo componente**: el mismo `li`
 * con `data-forma`, y la hoja de estilos decide la disposición. Así ninguna
 * forma puede quedarse sin un dato que las otras sí muestran, y el contenedor
 * es siempre un `ul`, que fue lo que rompió las combinaciones de la fase 6.
 *
 * El marcado es el mismo en las tres; lo que cambia es dónde queda la foto y,
 * con ella, qué tamaño se le pide al servidor:
 *
 * - `cuadricula`: arriba, a lo ancho de la tarjeta.
 * - `fila`: una miniatura al costado. Chica a propósito: a lo ancho bajaría el
 *   doble de imagen, y el tráfico de fotos es el primer techo del sistema.
 * - `vitrina`: de fondo, ocupando la tarjeta entera, con el nombre, el precio y
 *   el botón encima. Pide el mismo tamaño que la cuadrícula: las tarjetas miden
 *   lo mismo de ancho, solo son más altas.
 *
 * La acción —pedir, agendar, agregar— **no depende de la forma**: la decide la
 * modalidad del negocio, igual en las tres.
 *
 * Devuelve un `li`: el catálogo la lista dentro de un `ul` por categoría.
 */

/* El tamaño que ocupa la foto en pantalla, por forma, para que el navegador
   baje la del tamaño justo y no la de la cuadrícula. */
const FOTO_POR_FORMA = {
  cuadricula: { ancho: 640, sizes: "(min-width: 64rem) 240px, (min-width: 40rem) 30vw, 45vw" },
  fila: { ancho: 256, sizes: "96px" },
  vitrina: { ancho: 640, sizes: "(min-width: 64rem) 240px, (min-width: 48rem) 33vw, 50vw" },
} as const;
export function TarjetaMipuesto({
  producto,
  modalidad,
  permiteAcciones,
  demostracion,
  cantidadEnCarrito,
  alAgregarProducto,
  alAbrirWhatsapp,
  alVerProducto,
  slug,
  forma,
  iconoCategoria,
}: PropiedadesTarjeta) {
  /* Adónde lleva la tarjeta. Se arma una vez y la usan los dos lugares que se
     tocan —la fotografía y el botón del pie— para que no puedan llevar a
     direcciones distintas del mismo producto. */
  const href = slug ? rutaProductoPublico(slug, producto.codigo) : null;
  const insignia = insigniaDe(producto);

  return (
    <li
      className={styles.tarjeta}
      data-agotado={producto.estado === "agotado" ? "si" : undefined}
      data-forma={forma}
      id={producto.anclaCategoria}
    >
      <FotoProducto
        alVerProducto={alVerProducto}
        ancho={FOTO_POR_FORMA[forma].ancho}
        href={href}
        className={styles.tarjetaFoto}
        insignias={<InsigniaProducto producto={producto} />}
        producto={producto}
        /* Sin fotografía, el dibujo de su categoría sobre el color del negocio,
           en vez de un recuadro vacío con «Sin foto»: una fila de esos
           recuadros oscuros se leía como un catálogo roto. Es decorado, y el
           nombre del producto sigue diciendo qué es. */
        respaldo={
          <span className={styles.sinFoto} aria-hidden="true">
            <IconoCatalogo className={styles.sinFotoIcono} nombre={iconoCategoria} />
          </span>
        }
        sizes={FOTO_POR_FORMA[forma].sizes}
      />

      <div className={styles.tarjetaCuerpo}>
        {/* El nombre es el enlace, y su área se estira sobre la tarjeta entera:
            así se toca en cualquier parte —la foto, la descripción, el hueco— y
            no solo sobre la fotografía, que era lo único que llevaba.

            Se hace estirando un enlace y no envolviendo la tarjeta porque
            adentro hay otro botón, el del carrito, y un botón dentro de un
            enlace no es marcado válido ni se comporta bien en un teléfono. El
            del pie se levanta por encima con `z-index` y sigue siendo suyo. */}
        <h4 className={styles.tarjetaNombre}>
          {href ? (
            <Link className={styles.tarjetaEnlace} href={href} onClick={() => alVerProducto?.(producto.id)}>
              {producto.nombre}
            </Link>
          ) : (
            producto.nombre
          )}
        </h4>
        {producto.descripcion ? (
          <p className={styles.tarjetaDescripcion}>{producto.descripcion}</p>
        ) : null}

        {/* Los datos propios de su categoría, en una línea. Es lo que hace que
            cada rubro se vea distinto sin cambiar una regla de estilo. */}
        <LineaAtributos linea={producto.lineaAtributos} />

        {/* La pastilla ya dice si está agotado o reservado; no se repite el
            estado debajo cuando esa pastilla está. */}
        {insignia === null ? (
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
            href={href}
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
