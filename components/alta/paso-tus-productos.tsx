"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Boton, useAvisos } from "../ui";
import styles from "./paso.module.css";
import { cerrarAlta } from "../../lib/negocios/cerrar-alta";
import { RUTAS_PANEL } from "../../lib/panel/rutas";

/* Paso 4 del alta: los primeros productos.
 *
 * Tres caminos, y **en este orden a propósito**: el que menos trabajo cuesta
 * primero. Un comerciante que ya tiene su lista de precios escrita en un papel no
 * tiene por qué volver a tipearla; ofrecerle «cárgalos a mano» de entrada es
 * pedirle una tarde de trabajo antes de haber visto si el sistema le sirve.
 *
 * No exige cargar nada para terminar. Un catálogo vacío se puede publicar, y la
 * lista de «lo que falta» de la pantalla de inicio se encarga de recordárselo
 * cada vez que entre. Trabar el alta acá dejaría a quien quiere mirar primero y
 * cargar después encerrado en una pantalla.
 */
export function PasoTusProductos({
  productos,
  categorias,
}: {
  productos: number;
  categorias: number;
}) {
  const router = useRouter();
  const { mostrarAviso } = useAvisos();
  const [terminando, setTerminando] = useState(false);

  /* Los tres caminos también cierran el alta antes de ir: llevan a pantallas
     del panel, y el panel manda de vuelta al alta mientras siga abierta. Sin
     esto, «Sube un Excel» devolvía al dueño a este mismo paso. */
  async function terminar(destino: string = RUTAS_PANEL.productos) {
    if (terminando) return;
    setTerminando(true);
    try {
      await cerrarAlta();
      /* `refresh` antes de navegar: el panel decide a dónde mandar mirando
         `alta_completada_en`, y sin refrescar seguiría leyendo el valor viejo y
         lo devolvería al alta que acaba de cerrar. */
      router.refresh();
      router.push(destino);
    } catch (causa) {
      mostrarAviso({
        titulo: "No se pudo terminar",
        mensaje: causa instanceof Error ? causa.message : "Intenta de nuevo.",
        variante: "error",
      });
      setTerminando(false);
    }
  }

  return (
    <div className={styles.paso}>
      <div className={styles.titulo}>
        <h2>Tus primeros productos</h2>
        <p>
          {categorias > 0
            ? `Tu rubro ya te dejó ${categorias} categorías armadas. Ahora van los productos.`
            : "Elige por dónde empezar."}
        </p>
      </div>

      <ol className={styles.caminos}>
        <li>
          {/* A las herramientas, que es donde viven. Apuntaban a «Mi catálogo» con
              un `?asistente=` que ninguna pantalla leía —quedaron de antes de que
              las dos herramientas se mudaran— y el dueño caía en la lista de
              categorías sin entender qué pasó. */}
          <Link
            className={styles.camino}
            href={RUTAS_PANEL.desdeFoto}
            onClick={(evento) => {
              evento.preventDefault();
              void terminar(RUTAS_PANEL.desdeFoto);
            }}
          >
            <strong>Sácale una foto a tu lista de precios</strong>
            <span>La leemos y armamos los productos. Es lo más rápido si ya la tienes escrita.</span>
          </Link>
        </li>
        <li>
          <Link
            className={styles.camino}
            href={RUTAS_PANEL.importar}
            onClick={(evento) => {
              evento.preventDefault();
              void terminar(RUTAS_PANEL.importar);
            }}
          >
            <strong>Sube un Excel</strong>
            <span>Con la plantilla ya armada para tus categorías.</span>
          </Link>
        </li>
        <li>
          <Link
            className={styles.camino}
            href={RUTAS_PANEL.productos}
            onClick={(evento) => {
              evento.preventDefault();
              void terminar(RUTAS_PANEL.productos);
            }}
          >
            <strong>Cárgalos a mano</strong>
            <span>Uno por uno, con su foto y su precio.</span>
          </Link>
        </li>
      </ol>

      <div className={styles.cierre}>
        <p>
          {productos > 0
            ? `Llevas ${productos} producto(s) cargados. Puedes seguir agregando cuando quieras.`
            : "Puedes terminar ahora y cargarlos después: tu panel te va a ir recordando lo que falta."}
        </p>
        <Boton cargando={terminando} onClick={() => void terminar()} type="button">
          Terminar y ver mi panel
        </Boton>
      </div>
    </div>
  );
}
