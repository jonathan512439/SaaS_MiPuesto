import type { EstadoAtencion } from "../../lib/horario";

import styles from "./aviso-horario.module.css";

export function AvisoHorario({ estado }: { estado: EstadoAtencion }) {
  if (!estado.aviso) return null;

  return (
    <aside className={styles.aviso} role="status">
      <p>
        <strong>{estado.texto ?? "Pedidos pausados"}.</strong>{" "}
        {estado.horarioBreve ? <span>{estado.horarioBreve} </span> : null}
        <span>{estado.aviso}</span>
      </p>
    </aside>
  );
}
