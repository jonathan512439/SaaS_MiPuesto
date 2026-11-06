import Link from "next/link";

import { PRECIOS_DE_CARGA, enlaceCargaPorNosotros, enlaceCatalogoAMedida } from "../../lib/catalogo/catalogo-grande";
import { RUTAS_PANEL } from "../../lib/panel/rutas";
import { PRODUCTOS_MAXIMOS_EN_PLANES } from "../../lib/planes";
import styles from "./salidas-catalogo.module.css";

/* Cuando un archivo no se puede leer, el dueño sigue teniendo su catálogo por
 * cargar: esta pantalla le dice cómo, en vez de dejarlo con un error.
 *
 * Se queda a la vista y no en un aviso que se va solo, por lo mismo que la de
 * «es una planilla»: lo que hay que hacer es ir a otro lado, y el botón para ir
 * tiene que seguir ahí. */
export function SalidasCatalogo({ motivo }: { motivo: string }) {
  return (
    <section aria-live="polite" className={styles.salidas}>
      <h2>{motivo}</h2>
      <p>Elige cómo seguir. No pierdes nada de lo que ya cargaste.</p>
      <ul>
        <li>
          <strong>Te lo cargamos nosotros</strong>
          <span>Nos mandas tu archivo por WhatsApp y lo dejamos listo. {PRECIOS_DE_CARGA}</span>
          <a href={enlaceCargaPorNosotros()} rel="noreferrer" target="_blank">
            Pedir la carga
          </a>
        </li>
        <li>
          <strong>Cárgalo con una planilla</strong>
          <span>Bajas la plantilla de tu rubro, pegas tus productos y no gasta lecturas.</span>
          <Link href={RUTAS_PANEL.importar}>Ir a Importar una planilla</Link>
        </li>
        <li>
          <strong>¿Más de {PRODUCTOS_MAXIMOS_EN_PLANES} productos?</strong>
          <span>Escríbenos y acordamos un precio según tu cantidad.</span>
          <a href={enlaceCatalogoAMedida()} rel="noreferrer" target="_blank">
            Hablar de mi catálogo
          </a>
        </li>
      </ul>
      <p>También puedes subirlo por partes: las páginas de tu lista en fotos, o en PDF más chicos.</p>
    </section>
  );
}
