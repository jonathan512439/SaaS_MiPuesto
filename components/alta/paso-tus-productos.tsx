"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Boton, useAvisos } from "../ui";
import styles from "./paso.module.css";
import { RUTAS_PANEL } from "../../lib/panel/rutas";

/* Paso 4 del alta: los primeros productos.
 *
 * Tres caminos, y **en este orden a propósito**: el que menos trabajo cuesta
 * primero. Un comerciante que ya tiene su lista de precios escrita en un papel no
 * tiene por qué volver a tipearla; ofrecerle «cargalos a mano» de entrada es
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

  async function terminar() {
    setTerminando(true);
    try {
      const respuesta = await fetch("/api/alta/paso", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paso: 4, terminar: true }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo terminar.");
      /* `refresh` antes de navegar: el panel decide a dónde mandar mirando
         `alta_completada_en`, y sin refrescar seguiría leyendo el valor viejo y
         lo devolvería al alta que acaba de cerrar. */
      router.refresh();
      router.push(RUTAS_PANEL.productos);
    } catch (causa) {
      mostrarAviso({
        titulo: "No se pudo terminar",
        mensaje: causa instanceof Error ? causa.message : "Intentá de nuevo.",
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
            : "Elegí por dónde empezar."}
        </p>
      </div>

      <ol className={styles.caminos}>
        <li>
          <Link className={styles.camino} href="/dashboard/catalogo?asistente=foto">
            <strong>Sacale una foto a tu lista de precios</strong>
            <span>La leemos y armamos los productos. Es lo más rápido si ya la tenés escrita.</span>
          </Link>
        </li>
        <li>
          <Link className={styles.camino} href="/dashboard/catalogo?asistente=importar">
            <strong>Subí un Excel</strong>
            <span>Con la plantilla ya armada para tus categorías.</span>
          </Link>
        </li>
        <li>
          <Link className={styles.camino} href={RUTAS_PANEL.productos}>
            <strong>Cargalos a mano</strong>
            <span>Uno por uno, con su foto y su precio.</span>
          </Link>
        </li>
      </ol>

      <div className={styles.cierre}>
        <p>
          {productos > 0
            ? `Llevás ${productos} producto(s) cargados. Podés seguir agregando cuando quieras.`
            : "Podés terminar ahora y cargarlos después: tu panel te va a ir recordando lo que falta."}
        </p>
        <Boton cargando={terminando} onClick={() => void terminar()} type="button">
          Terminar y ver mi panel
        </Boton>
      </div>
    </div>
  );
}
