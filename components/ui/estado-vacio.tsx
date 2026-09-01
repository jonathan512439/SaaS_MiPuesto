import type { ReactNode } from "react";

import styles from "./ui.module.css";

type PropiedadesEstadoVacio = {
  titulo: string;
  descripcion: string;
  accion?: ReactNode;
};

export function EstadoVacio({ titulo, descripcion, accion }: PropiedadesEstadoVacio) {
  return (
    <div className={styles.estadoVacio}>
      <div>
        <h3 className={styles.tituloVacio}>{titulo}</h3>
        <p className={styles.descripcionVacio}>{descripcion}</p>
      </div>
      {accion ? <div className={styles.accionVacio}>{accion}</div> : null}
    </div>
  );
}
