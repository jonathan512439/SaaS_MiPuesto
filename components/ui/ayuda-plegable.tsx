import type { ReactNode } from "react";

import styles from "./ayuda-plegable.module.css";

/* Una ayuda en dos niveles: una línea siempre a la vista y el detalle a un
 * toque.
 *
 * Nació el 2026-10-22, cuando el dueño señaló que el panel saturaba de texto.
 * El detalle no estaba mal: estaba siempre abierto. Los pasos para sacar el
 * enlace de Google, el instructivo completo de una foto o qué pasa cuando un
 * horario cruza la medianoche sirven el día que hacen falta, y los otros días
 * ocupan media pantalla.
 *
 * `details` y no un estado de React: se abre sin JavaScript, el teclado lo
 * maneja solo y el lector de pantalla dice si está abierto. Arranca plegada:
 * el título dice qué hay adentro —«Cómo preparar la foto»—, y abrirla sola
 * mientras el campo está vacío la dejaba a la vista justo en el caso más común,
 * un producto nuevo.
 */
export function AyudaPlegable({
  resumen,
  titulo = "Más detalles",
  abierta = false,
  children,
  className,
}: {
  /* La línea que siempre se ve. Opcional: a veces basta el enlace. */
  resumen?: ReactNode;
  titulo?: string;
  abierta?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={[styles.ayuda, className].filter(Boolean).join(" ")}>
      {resumen ? <small className={styles.resumen}>{resumen}</small> : null}
      <details className={styles.plegable} open={abierta}>
        <summary>{titulo}</summary>
        <div className={styles.detalle}>{children}</div>
      </details>
    </div>
  );
}
