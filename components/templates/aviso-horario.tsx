import type { EstadoAtencion } from "../../lib/horario";

import styles from "./aviso-horario.module.css";

export function AvisoHorario({ estado }: { estado: EstadoAtencion }) {
  if (!estado.aviso) return null;

  return (
    <aside className={styles.aviso} role="status">
      <strong>{estado.texto ?? "Pedidos pausados"}</strong>
      <p>{estado.aviso}</p>
    </aside>
  );
}
