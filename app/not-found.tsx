import type { Metadata } from "next";
import { PieSitio } from "../components/sitio/pie-sitio";
import Link from "next/link";

import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Catálogo no disponible | MiPuesto",
  description: "El catálogo solicitado no existe o no está disponible por el momento.",
};

export default function PaginaNoEncontrada() {
  return (
    <>
      <main className={styles.pagina}>
        <section className={styles.mensaje}>
          <Link className={styles.marca} href="/">MiPuesto</Link>
          <h1>No encontramos este negocio</h1>
          <p>El enlace pudo cambiar, o el catálogo está inactivo por ahora.</p>
          <div className={styles.acciones}>
            <Link href="/directorio">Explorar negocios activos</Link>
            <Link href="/">Volver a MiPuesto</Link>
          </div>
        </section>
      </main>
        <PieSitio />
    </>
  );
}
