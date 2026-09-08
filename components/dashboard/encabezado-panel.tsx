import type { ReactNode } from "react";

import styles from "./encabezado-panel.module.css";

/* El encabezado de una pantalla del panel: el rótulo, el título y la bajada.
 *
 * Estaba escrito ocho veces, una por hoja de estilos, y ya se habían separado
 * solos: la pantalla de plataforma tenía el título un escalón más grande y más
 * grueso que las demás, la de cuenta había perdido la rejilla y la de resumen
 * usaba otro espaciado. Nadie lo hizo a propósito; ocho copias de algo que
 * tiene que verse igual terminan así siempre.
 *
 * Las tres formas que existían caben acá: un título solo, un rótulo encima —
 * «Últimos 7 días», «Administración»— y una bajada debajo. `accion` es para lo
 * que va del otro lado, como «Ver en mi negocio», y `children` para lo que
 * cuelga abajo.
 */
export function EncabezadoPanel({
  accion,
  children,
  descripcion,
  rotulo,
  titulo,
}: {
  accion?: ReactNode;
  children?: ReactNode;
  descripcion?: ReactNode;
  rotulo?: string;
  titulo: string;
}) {
  return (
    <header className={styles.encabezado}>
      <div className={styles.fila}>
        <div className={styles.texto}>
          {rotulo ? <p className={styles.rotulo}>{rotulo}</p> : null}
          <h1>{titulo}</h1>
          {descripcion ? <p className={styles.descripcion}>{descripcion}</p> : null}
        </div>
        {accion ? <div className={styles.accion}>{accion}</div> : null}
      </div>
      {children}
    </header>
  );
}
