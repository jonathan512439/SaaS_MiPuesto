import { useId } from "react";

import { TRAZOS_CATALOGO, type NombreIconoCatalogo } from "../iconos/catalogo";
import { ICONO_PREDETERMINADO, normalizarIcono } from "../../lib/catalogo/categorias";
import styles from "./patron-categorias.module.css";

/* El fondo del catálogo, armado con los íconos de las categorías del negocio.
 *
 * Reemplaza al dibujo por rubro —uno fijo por oficio, en `public/patrones/`—
 * cuando el negocio tiene categorías propias: una veterinaria que vende alimento,
 * juguetes y consultas termina con **su** fondo, no con el genérico de
 * «servicios». Sin categorías cae al de rubro, que sigue existiendo para eso.
 *
 * Va como SVG en el árbol y no como máscara de CSS, al revés que el de rubro.
 * El motivo es concreto: la máscara se declara con `url(...)` en una variable, y
 * la variable tendría que cambiar por negocio, lo que obliga a un estilo en
 * línea —que la guarda de tokens prohíbe, y con razón—. Dibujado acá, el color
 * lo pone `currentColor` desde la hoja y no hay ningún valor calculado en el
 * HTML.
 *
 * **El trazo sale siempre del archivo generado, nunca del dato.** El nombre del
 * ícono lo escribió el dueño y vive en la base, así que se normaliza contra el
 * juego versionado igual que en `IconoCatalogo`: lo que no es una llave conocida
 * cae al predeterminado. Aunque alguien escribiera HTML en esa columna, nunca se
 * dibujaría.
 */

/* Las posiciones son fijas y no al azar: un `Math.random()` acá daría un dibujo
   en el servidor y otro en el navegador, y React marcaría la diferencia como
   error de hidratación. Son dieciséis —eran ocho hasta el 2026-10-14, cuando
   el dueño pidió el doble de dibujos—, repartidas a mano sobre una baldosa de
   384 en una cuadrícula de 4 × 4 corrida, con giros y tamaños distintos para
   que no se lea como grilla.

   Ninguna se va del borde —la mayor mide 24 × 1.6 ≈ 38, y la más corrida
   empieza en 334— porque el contenido de un `pattern` se recorta en la baldosa
   y un ícono cortado por la mitad se ve como un error de carga. */
const POSICIONES = [
  { x: 14, y: 18, escala: 1.5, giro: -12 },
  { x: 112, y: 8, escala: 1.2, giro: 14 },
  { x: 206, y: 30, escala: 1.4, giro: -6 },
  { x: 300, y: 12, escala: 1.3, giro: 10 },
  { x: 60, y: 104, escala: 1.3, giro: 9 },
  { x: 158, y: 118, escala: 1.6, giro: -16 },
  { x: 250, y: 96, escala: 1.2, giro: 12 },
  { x: 332, y: 128, escala: 1.4, giro: -8 },
  { x: 16, y: 196, escala: 1.4, giro: 10 },
  { x: 108, y: 214, escala: 1.2, giro: -8 },
  { x: 204, y: 190, escala: 1.5, giro: 16 },
  { x: 296, y: 222, escala: 1.3, giro: -12 },
  { x: 62, y: 300, escala: 1.2, giro: -6 },
  { x: 160, y: 314, escala: 1.4, giro: 8 },
  { x: 254, y: 292, escala: 1.6, giro: -14 },
  { x: 334, y: 330, escala: 1.2, giro: 12 },
] as const;

const LADO_BALDOSA = 384;

export function PatronCategorias({ iconos }: { iconos: string[] }) {
  /* Único por instancia: la vista previa del panel y el catálogo pueden quedar
     en la misma página, y dos `pattern` con la misma id harían que el segundo
     dibujara el primero. */
  const id = useId();
  if (iconos.length === 0) return null;

  return (
    <svg
      aria-hidden="true"
      className={styles.patron}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          height={LADO_BALDOSA}
          id={id}
          patternUnits="userSpaceOnUse"
          width={LADO_BALDOSA}
        >
          {POSICIONES.map(({ x, y, escala, giro }, posicion) => {
            /* Los íconos se reparten por las posiciones y se repiten si son
               menos que dieciséis: el fondo siempre se ve lleno. */
            const seguro: NombreIconoCatalogo = normalizarIcono(
              iconos[posicion % iconos.length],
            );
            const trazo = TRAZOS_CATALOGO[seguro] ?? TRAZOS_CATALOGO[ICONO_PREDETERMINADO];
            return (
              <g
                dangerouslySetInnerHTML={{ __html: trazo }}
                key={posicion}
                transform={`translate(${x} ${y}) rotate(${giro}) scale(${escala})`}
              />
            );
          })}
        </pattern>
      </defs>
      <rect fill={`url(#${id})`} height="100%" width="100%" />
    </svg>
  );
}
