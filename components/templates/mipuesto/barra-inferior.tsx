"use client";

import type { ModoAccionCatalogo } from "../../../lib/modalidades";
import { Icono } from "../../iconos/icono";
import styles from "./plantilla-mipuesto.module.css";

/* La barra fija de abajo, como en el diseño de referencia.
 *
 * Muestra **solo lo que la modalidad tiene**, no las cinco pestañas de la
 * maqueta. «Pedidos» y «Perfil» se fueron: necesitan cuenta de comprador, que el
 * sistema no tiene por decisión, y una pestaña que no lleva a ningún lado le
 * enseña al visitante que los botones no sirven.
 *
 * «Ofertas» aparece solo si hay promociones activas, por lo mismo: una pestaña
 * que abre una lista vacía es una pestaña rota.
 */
export function BarraInferior({
  modalidad,
  hayOfertas,
  productosEnCarrito,
  telefonoWhatsapp,
  ubicacionUrl,
  alIrInicio,
  alIrCategorias,
  alIrOfertas,
  alAbrirCarrito,
}: {
  modalidad: ModoAccionCatalogo;
  hayOfertas: boolean;
  productosEnCarrito: number;
  telefonoWhatsapp: string;
  ubicacionUrl: string | null;
  alIrInicio: () => void;
  alIrCategorias: () => void;
  alIrOfertas: () => void;
  alAbrirCarrito: () => void;
}) {
  return (
    <nav aria-label="Acciones rápidas" className={styles.barraInferior}>
      <button onClick={alIrInicio} type="button">
        <Icono nombre="casa" />
        <span>Inicio</span>
      </button>

      <button onClick={alIrCategorias} type="button">
        <Icono nombre="carpeta" />
        <span>Categorías</span>
      </button>

      {hayOfertas ? (
        <button onClick={alIrOfertas} type="button">
          <Icono nombre="etiqueta" />
          <span>Ofertas</span>
        </button>
      ) : null}

      {modalidad === "carrito" ? (
        <button
          className={styles.barraCarrito}
          data-lleno={productosEnCarrito > 0 ? "si" : undefined}
          onClick={alAbrirCarrito}
          type="button"
        >
          <Icono nombre="bolsa" />
          <span>{productosEnCarrito > 0 ? `Carrito · ${productosEnCarrito}` : "Carrito"}</span>
        </button>
      ) : null}

      {modalidad === "accion_individual" ? (
        <a href={`https://wa.me/${telefonoWhatsapp}`} rel="noreferrer" target="_blank">
          <Icono nombre="telefono" />
          <span>WhatsApp</span>
        </a>
      ) : null}

      {modalidad === "solo_lectura" && ubicacionUrl ? (
        <a href={ubicacionUrl} rel="noreferrer" target="_blank">
          <Icono nombre="ubicacion" />
          <span>Ubicación</span>
        </a>
      ) : null}
    </nav>
  );
}
