import Link from "next/link";

import styles from "./plataforma.module.css";
import { RUTAS_PANEL } from "../../../lib/panel/rutas";

/* La página sigue respondiendo 404 —quien no administra la plataforma no tiene
   por qué enterarse de que existe—, pero con su propio mensaje: el del sitio
   dice «No encontramos este negocio», que manda a buscar el problema en un
   catálogo cuando en realidad falta un permiso. */
export default function PlataformaNoEncontrada() {
  return (
    <main className={styles.pagina}>
      <section className={styles.noEncontrada}>
        <h1>Esta página no está disponible</h1>
        <p>
          La dirección no existe, o tu cuenta no tiene acceso a esta sección. Si
          esperabas administrar la plataforma, revisá con qué cuenta iniciaste sesión.
        </p>
        <Link href={RUTAS_PANEL.inicio}>Ir a mi panel</Link>
      </section>
    </main>
  );
}
