import { Esqueleto } from "../../../components/ui";
import styles from "./cargando.module.css";
import panel from "./panel.module.css";

/* Las pantallas del panel consultan Supabase en el servidor, asi que al cambiar
   de seccion hay un hueco sin nada en pantalla. El esqueleto reserva el alto de
   la cabecera y del primer bloque para que el contenido no salte al llegar. */
export default function CargandoPanel() {
  return (
    <main aria-busy="true" className={panel.contenido}>
      <p className={styles.soloLectores} role="status">
        Cargando la sección…
      </p>
      <div className={styles.encabezado}>
        <Esqueleto variante="titulo" />
      </div>
      <div className={styles.bloque}>
        <Esqueleto variante="titulo" />
        <div className={styles.filas}>
          <Esqueleto />
          <Esqueleto />
          <Esqueleto />
        </div>
      </div>
    </main>
  );
}
