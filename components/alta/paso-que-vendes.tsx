"use client";

import type { ZonaConCentro } from "../../lib/negocios/coordenadas";
import { QueVendesYDonde, type PresenciaInicial } from "../negocios/que-vendes-y-donde";
import styles from "./paso.module.css";

/* Paso 2 del alta: qué vende el negocio y si quiere que lo encuentren.
 *
 * Desde la fase 11 este paso pregunta dos cosas, y las dos se guardan juntas:
 * el rubro —que decide qué categorías y campos se siembran— y la decisión de
 * aparecer en el buscador de MiPuesto, con la ubicación si dice que sí.
 *
 * El formulario es el mismo que el de «Mi negocio»: vive en
 * `QueVendesYDonde`, para que las dos pantallas no puedan preguntar distinto.
 * Acá solo se pone el marco del paso.
 */
export function PasoQueVendes({
  inicial,
  zonas,
  enlaceMaps,
  rubroFijo,
}: {
  inicial: PresenciaInicial;
  zonas: ZonaConCentro[];
  enlaceMaps: string | null;
  rubroFijo: boolean;
}) {
  return (
    <section className={styles.paso}>
      <div className={styles.titulo}>
        <h2>Qué vendes y dónde</h2>
        <p>Con esto preparamos tus categorías, y decides si quieres que te encuentren.</p>
      </div>
      <QueVendesYDonde
        enlaceMaps={enlaceMaps}
        inicial={inicial}
        modo="alta"
        rubroFijo={rubroFijo}
        zonas={zonas}
      />
    </section>
  );
}
