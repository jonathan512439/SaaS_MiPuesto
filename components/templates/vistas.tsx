"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import type { PlantillaId } from "../../lib/apariencia";
import type { PropiedadesPlantilla } from "../../lib/plantillas/tipos";
import { Esqueleto } from "../ui";
import styles from "./vistas.module.css";

/* Las cuatro plantillas, cargadas por separado y bajo demanda.
 *
 * Vive acá y no dentro de una pantalla porque ya hay tres lugares que las
 * necesitan: la muestra de la portada, el selector del panel y la hoja de
 * contactos que compara las veintiocho combinaciones. Con una copia por
 * pantalla, agregar una quinta plantilla sería acordarse de tres archivos.
 *
 * Cada una se carga sola: quien mira una plantilla no descarga las otras tres.
 */

function VistaCargando() {
  return (
    <div aria-hidden="true" className={styles.cargando}>
      <Esqueleto variante="imagen" />
      <Esqueleto variante="titulo" />
      <Esqueleto />
    </div>
  );
}

export const VISTAS_PLANTILLA: Record<PlantillaId, ComponentType<PropiedadesPlantilla>> = {
  clasica: dynamic(
    () => import("./clasica/plantilla-clasica").then((m) => m.PlantillaClasica),
    { loading: VistaCargando },
  ),
  moderna: dynamic(
    () => import("./moderna/plantilla-moderna").then((m) => m.PlantillaModerna),
    { loading: VistaCargando },
  ),
  minimal: dynamic(
    () => import("./minimal/plantilla-minimal").then((m) => m.PlantillaMinimal),
    { loading: VistaCargando },
  ),
  feria: dynamic(
    () => import("./feria/plantilla-feria").then((m) => m.PlantillaFeria),
    { loading: VistaCargando },
  ),
  catalogo: dynamic(
    () => import("./catalogo/plantilla-catalogo").then((m) => m.PlantillaCatalogo),
    { loading: VistaCargando },
  ),
};
