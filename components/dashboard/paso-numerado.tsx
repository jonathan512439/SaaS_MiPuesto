import type { ReactNode } from "react";

import { Icono, type NombreIcono } from "../iconos/icono";
import styles from "./paso-numerado.module.css";

/* El título de un bloque dentro de una pantalla del panel: un disco a la
 * izquierda, el título y su explicación.
 *
 * Existían dos formas de lo mismo. El formulario del negocio dibujaba el número
 * dentro de un disco de color; el de apariencia lo escribía adentro del texto,
 * «1. Elige la estructura», que se lee como una lista y no como un paso. Las dos
 * pantallas se recorren seguidas y la diferencia se nota.
 *
 * El disco lleva un número cuando los bloques son pasos que se hacen en orden, y
 * un ícono cuando son apartados independientes: numerar lo que no tiene orden
 * inventa una secuencia que nadie tiene por qué seguir.
 */
export function PasoNumerado({
  descripcion,
  icono,
  idTitulo,
  numero,
  titulo,
}: {
  descripcion?: ReactNode;
  icono?: NombreIcono;
  idTitulo?: string;
  numero?: number;
  titulo: string;
}) {
  return (
    <div className={styles.paso}>
      <span aria-hidden="true" className={icono ? styles.discoIcono : styles.disco}>
        {icono ? <Icono nombre={icono} /> : numero}
      </span>
      <div>
        <h2 id={idTitulo}>{titulo}</h2>
        {descripcion ? <p>{descripcion}</p> : null}
      </div>
    </div>
  );
}
