"use client";

import { usePathname } from "next/navigation";

import { PASOS_ALTA, pasoActualDeAlta } from "../../lib/negocios/alta";
import { EncabezadoPanel } from "../dashboard/encabezado-panel";
import styles from "../../app/(admin)/alta/alta.module.css";

/* El encabezado del alta con su progreso.
 *
 * Es de cliente por una razón: vive en el layout, y un layout no se vuelve a
 * dibujar al pasar de un paso a otro con «Seguir». Con el paso que mandó el
 * servidor al entrar, la barra se quedaba en «Paso 1 de 4» durante todo el
 * recorrido. El paso se lee de la dirección; lo alcanzado sigue viniendo del
 * servidor, para marcar como hechos los pasos ya guardados.
 */
export function EncabezadoAlta({ alcanzado, titulo }: { alcanzado: number; titulo: string }) {
  const actual = pasoActualDeAlta(usePathname(), alcanzado);
  const hasta = Math.max(actual, alcanzado);
  return (
    <EncabezadoPanel rotulo={`Paso ${actual} de ${PASOS_ALTA.length}`} titulo={titulo}>
      {/* Una lista ordenada y no una fila de puntos: para quien usa lector de
          pantalla, «paso 2 de 4» tiene que poder leerse, no solo verse. */}
      <ol className={styles.progreso}>
        {PASOS_ALTA.map((paso) => {
          const estado =
            paso.numero === actual ? "actual" : paso.numero < hasta ? "hecho" : "pendiente";
          return (
            <li className={styles.paso} data-estado={estado} key={paso.id}>
              <span aria-hidden="true" className={styles.disco}>
                {paso.numero}
              </span>
              <span className={styles.nombrePaso}>{paso.titulo}</span>
              <span className={styles.soloLectores}>
                {estado === "hecho" ? " (hecho)" : estado === "actual" ? " (acá estás)" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </EncabezadoPanel>
  );
}
