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
   error de hidratación. Están repartidas a mano sobre la baldosa de 288 para que
   no se lean como una grilla, con giros y tamaños distintos.

   Ninguna se va del borde —la mayor mide 24 × 1.7 ≈ 41— porque el contenido de
   un `pattern` se recorta en la baldosa y un ícono cortado por la mitad se ve
   como un error de carga, no como una trama. */
const POSICIONES = [
  { x: 20, y: 26, escala: 1.6, giro: -12 },
  { x: 150, y: 14, escala: 1.2, giro: 14 },
  { x: 228, y: 70, escala: 1.4, giro: -6 },
  { x: 72, y: 112, escala: 1.3, giro: 9 },
  { x: 168, y: 146, escala: 1.7, giro: -16 },
  { x: 26, y: 206, escala: 1.4, giro: 10 },
  { x: 124, y: 232, escala: 1.2, giro: -8 },
  { x: 230, y: 192, escala: 1.5, giro: 16 },
] as const;

const LADO_BALDOSA = 288;

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
            /* Las categorías se reparten por las posiciones y se repiten si son
               menos que ocho: con tres categorías el fondo igual se ve lleno. */
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
