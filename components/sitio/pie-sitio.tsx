import Link from "next/link";

import {
  DESARROLLADOR,
  WHATSAPP_MIPUESTO,
  construirEnlaceContacto,
} from "../../lib/contacto";
import styles from "./pie-sitio.module.css";

/* Único elemento de MiPuesto que aparece dentro del catálogo de un negocio, así
   que se mantiene discreto y usa los colores del producto y no los de la paleta
   elegida por el dueño: es cromo nuestro, no de su tienda. */
export function PieSitio() {
  return (
    <footer className={styles.pie}>
      <p className={styles.credito}>
        Desarrollado por {DESARROLLADOR.nombre}
      </p>
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
