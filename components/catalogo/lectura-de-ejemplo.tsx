"use client";

import { useState } from "react";

import { AYUDA_LISTA } from "../../lib/ia/ayuda";
import { Icono } from "../iconos/icono";
import { Boton } from "../ui";
import styles from "./lectura-de-ejemplo.module.css";

/* La lista de ejemplo, leída delante del dueño.
 *
 * Antes era un bloque de texto con la entrada a un lado y la salida al otro, y
 * había que adivinar qué renglón se convertía en qué. Ahora un haz recorre la
 * hoja renglón por renglón y cada uno cae del otro lado ya convertido: el título
 * de sección se vuelve categoría y el resto, productos. Es lo que hace la
 * herramienta, contado en seis segundos, y se entiende sin leer la nota.
 *
 * Corre una vez y queda quieta en el resultado: una animación que no para le
 * compite a las indicaciones de abajo (WCAG 2.2.2). «Ver de nuevo» la repite.
 * Con movimiento reducido no corre: se ve directamente el resultado.
 *
 * El texto está siempre en la página —la animación solo cambia la opacidad—, así
 * que un lector de pantalla lo lee entero y en orden desde el principio. */
export function LecturaDeEjemplo() {
  const { entrada, salida, titulo, nota } = AYUDA_LISTA.ejemplo;
  /* Cambiarla remonta la escena, y remontarla vuelve a correr la animación. */
  const [vuelta, setVuelta] = useState(0);
  /* El primer renglón es el título de sección: cae como la categoría. Los
     siguientes caen como productos, en el orden en que se leyeron. */
  const categoria = salida[0]?.categoria ?? "";

  return (
    <section aria-labelledby="lectura-de-ejemplo" className={styles.lectura}>
      <h2 className={styles.titulo} id="lectura-de-ejemplo">
        <Icono nombre="rayo" />
        {titulo}
      </h2>

      <div className={styles.escena} key={vuelta}>
        <figure className={styles.hoja}>
          <figcaption>Tu lista</figcaption>
          <div className={styles.texto}>
            <ol className={styles.renglones}>
              {entrada.map((renglon) => (
                <li key={renglon}>{renglon}</li>
              ))}
            </ol>
          </div>
        </figure>

        <span aria-hidden="true" className={styles.flecha}>
          <Icono nombre="flechaAbajo" />
        </span>

        <figure className={styles.resultado}>
          <figcaption>Tu catálogo</figcaption>
          <p className={styles.categoria}>
            <Icono nombre="carpeta" />
            {categoria}
          </p>
          <ul className={styles.productos}>
            {salida.map((fila) => (
              <li key={fila.nombre}>
                <span>{fila.nombre}</span>
                <strong>{fila.precio}</strong>
              </li>
            ))}
          </ul>
        </figure>
      </div>

      {/* Al pie y no arriba: se repite después de haberla visto, y arriba le
          ganaba la primera mirada a la lista misma. */}
      <div className={styles.pie}>
        <p className={styles.nota}>{nota}</p>
        <Boton onClick={() => setVuelta((numero) => numero + 1)} variante="secundario">
          Ver de nuevo
        </Boton>
      </div>
    </section>
  );
}
