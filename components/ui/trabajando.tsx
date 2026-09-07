"use client";

import { useEffect, useId, useRef } from "react";

import styles from "./trabajando.module.css";

type PropiedadesTrabajando = {
  abierto: boolean;
  titulo: string;
  detalle: string;
};

/* Aviso de que la herramienta está pensando.
 *
 * Va como diálogo modal y no como un cartel al costado a propósito: leer una
 * foto tarda entre dos y veinte segundos, y en ese rato la pantalla no cambia.
 * Sin bloquear, la persona vuelve a apretar el botón, y cada intento gasta una
 * llamada del nivel gratuito.
 *
 * No se puede cerrar con Escape ni tocando afuera: cerrarlo no cancelaría el
 * pedido, solo ocultaría que está en curso. El pedido tiene su propio límite de
 * tiempo, así que esto nunca queda trabado para siempre.
 */
export function Trabajando({ abierto, titulo, detalle }: PropiedadesTrabajando) {
  const referencia = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      aria-labelledby={idTitulo}
      className={styles.dialogo}
      onCancel={(evento) => {
        evento.preventDefault();
      }}
      ref={referencia}
    >
      {/* `role="status"` y no `alert`: es información de progreso, y un lector
          de pantalla no debe interrumpir lo que esté diciendo para anunciarla. */}
      <div className={styles.contenido} role="status">
        <span aria-hidden="true" className={styles.rueda} />
        <strong id={idTitulo}>{titulo}</strong>
        <p>{detalle}</p>
        <small>No cierres esta ventana ni vuelvas a tocar el botón.</small>
      </div>
    </dialog>
  );
}
