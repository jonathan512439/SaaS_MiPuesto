import { Isotipo } from "../marca/isotipo";
import Link from "next/link";

import {
  DESARROLLADOR,
  WHATSAPP_MIPUESTO,
  construirEnlaceContacto,
} from "../../lib/contacto";
import styles from "./pie-sitio.module.css";

type PropiedadesPie = {
  /* En el catálogo de un negocio la firma es de MiPuesto y nada más: el visitante
     podría contratar MiPuesto, no el estudio que lo construyó, y dos marcas en la
     vitrina de un cliente que paga son una de más. El crédito al desarrollador
     vive en las páginas propias, que es donde tiene a quién decírselo. */
  variante?: "sitio" | "catalogo";
};

/* El enlace lleva de dónde viene para poder distinguir, en la analítica del
   borde, cuánta gente llega desde el catálogo de un negocio. Sin marcarlo no hay
   forma de saber si esta firma sirve de algo. */
const ORIGEN_CATALOGO = "/?desde=catalogo";

export function PieSitio({ variante = "sitio" }: PropiedadesPie) {
  if (variante === "catalogo") {
    return (
      <footer className={`${styles.pie} ${styles.pieCatalogo}`}>
        <Link className={styles.firma} href={ORIGEN_CATALOGO}>
          <Isotipo className={styles.isotipo} />
          <span>
            Hecho con <strong>MiPuesto</strong>
          </span>
        </Link>
        <nav aria-label="Enlaces de MiPuesto" className={styles.enlaces}>
          <Link href="/terminos">Términos</Link>
          <Link href="/privacidad">Privacidad</Link>
        </nav>
      </footer>
    );
  }

  return (
    <footer className={styles.pie}>
      <p className={styles.credito}>Desarrollado por {DESARROLLADOR.nombre}</p>
      <nav aria-label="Enlaces de MiPuesto" className={styles.enlaces}>
        <Link href="/terminos">Términos</Link>
        <Link href="/privacidad">Privacidad</Link>
        <a href={DESARROLLADOR.url} rel="noreferrer" target="_blank">
          Ver soluciones de {DESARROLLADOR.nombre}
        </a>
        <a
          href={construirEnlaceContacto("Hola, quiero consultar sobre MiPuesto.")}
          rel="noreferrer"
          target="_blank"
        >
          Escribir al {WHATSAPP_MIPUESTO.slice(3)}
        </a>
      </nav>
    </footer>
  );
}
