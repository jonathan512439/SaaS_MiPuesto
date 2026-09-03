import type { Metadata } from "next";
import Link from "next/link";

import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Catálogo no disponible | MiPuesto",
  description: "El catálogo solicitado no existe o no está disponible por el momento.",
};

export default function PaginaNoEncontrada() {
  return (
    <main className={styles.pagina}>
      <section className={styles.mensaje}>
        <Link className={styles.marca} href="/">MiPuesto</Link>
        <p>Catálogo no disponible</p>
        <h1>No encontramos este negocio</h1>
        <p>
          Es posible que el enlace haya cambiado o que el catálogo esté temporalmente inactivo.
          No se eliminó ningún dato por esta visita.
        </p>
        <div className={styles.acciones}>
          <Link href="/directorio">Explorar negocios activos</Link>
          <Link href="/">Volver a MiPuesto</Link>
        </div>
      </section>
    </main>
  );
}

