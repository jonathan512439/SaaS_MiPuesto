import Link from "next/link";

import { Icono } from "../iconos/icono";
import { Isotipo } from "../marca/isotipo";
import styles from "./cabecera-sitio.module.css";

/* La cabecera del sitio público: la portada y el directorio.
 *
 * Tres cosas y nada más: la marca, el directorio —con lo que se hace ahí,
 * «Buscá negocios», porque la palabra «directorio» sola no le dice nada a quien
 * llega— y la entrada de quien ya tiene su catálogo. El directorio se ve también
 * en el teléfono: es la puerta para los compradores, y esconderla en un menú la
 * dejaría sin usar.
 */
export function CabeceraSitio({ actual }: { actual: "inicio" | "directorio" }) {
  return (
    <header className={styles.cabecera}>
      <div className={styles.contenido}>
        <Link aria-label="MiPuesto, inicio" className={styles.marca} href="/">
          <Isotipo className={styles.isotipo} />
          <span>MiPuesto</span>
        </Link>
        <nav aria-label="Principal" className={styles.enlaces}>
          <Link
            aria-current={actual === "directorio" ? "page" : undefined}
            className={styles.directorio}
            href="/directorio"
          >
            <Icono nombre="lupa" />
            <span>
              <strong>Directorio</strong>
              <small>Buscá negocios</small>
            </span>
          </Link>
          <Link className={styles.secundario} href="/#precio">
            Precios
          </Link>
          <Link className={styles.ingresar} href="/login">
            Ingresar
          </Link>
        </nav>
      </div>
      {/* La cinta de aguayo: la firma del sitio, fina, debajo de la cabecera. */}
      <div aria-hidden="true" className={styles.cinta} />
    </header>
  );
}
