"use client";

import { useState } from "react";

import { DEFINICIONES_PALETAS, PALETAS } from "../../../lib/apariencia";
import type { PaletaId } from "../../../lib/apariencia";
import { DEMOS_POR_RUBRO } from "../../../lib/plantillas/demos-rubro";
import { PlantillaMipuesto } from "../../../components/templates/mipuesto/plantilla-mipuesto";
import styles from "./hoja-de-contactos.module.css";

/* El catálogo en sus diez colores, a la vez y en la misma pantalla.
 *
 * Existe porque las pruebas **no ven** que algo quedó feo. Comprueban contraste
 * y tokens, y las dos cosas pueden estar perfectas mientras una tarjeta se
 * desarma en la paleta oscura o un botón desaparece sobre su propio fondo.
 * Diez colores son diez pantallas que nadie va a abrir de a una, y por eso nadie
 * las mira: la que se rompe se descubre cuando la abre un cliente.
 *
 * Antes comparaba además cuatro diseños, y eran veintiocho celdas. Con la poda
 * de la fase 6 el diseño es uno solo, así que lo que queda por comparar es el
 * color —y el rubro, que es lo que de verdad cambia el contenido—.
 *
 * Es una herramienta de trabajo, no una pantalla de producto.
 */
export function HojaDeContactos() {
  const [rubroId, setRubroId] = useState(DEMOS_POR_RUBRO[0].id);
  const [conPatron, setConPatron] = useState(true);

  const demo = DEMOS_POR_RUBRO.find(({ id }) => id === rubroId) ?? DEMOS_POR_RUBRO[0];
  const nombrePaleta = (id: PaletaId) =>
    DEFINICIONES_PALETAS.find((paleta) => paleta.id === id)?.nombre ?? id;

  return (
    <main className={styles.pagina}>
      <header className={styles.encabezado}>
        <h1>Hoja de contactos</h1>
        <p>
          El catálogo en sus {PALETAS.length} colores, juntos. Después de cualquier cambio
          visual, se recorre esta pantalla: es lo único que muestra lo que las pruebas no
          pueden ver.
        </p>
      </header>

      <div className={styles.controles}>
        <fieldset>
          <legend>Con qué contenido</legend>
          <div className={styles.opciones}>
            {DEMOS_POR_RUBRO.map(({ id, rubro }) => (
              <label className={rubroId === id ? styles.elegida : styles.opcion} key={id}>
                <input
                  checked={rubroId === id}
                  name="rubro"
                  onChange={() => setRubroId(id)}
                  type="radio"
                />
                {rubro}
              </label>
            ))}
          </div>
        </fieldset>

        {/* El patrón de fondo se apaga y se prende porque es lo que más fácil
            arruina el contraste de una tarjeta, y es justo lo que no se nota
            mirando una sola combinación. */}
        <label className={styles.interruptor}>
          <input
            checked={conPatron}
            onChange={(evento) => setConPatron(evento.target.checked)}
            type="checkbox"
          />
          Con el fondo de dibujos
        </label>
      </div>

      <div className={styles.grilla}>
        {PALETAS.map((paleta) => (
          <figure className={styles.celda} key={paleta}>
            <figcaption>
              <strong>{nombrePaleta(paleta)}</strong>
              <span>{demo.rubro}</span>
            </figcaption>
            {/* El contenido se dibuja a tamaño de teléfono y se achica con una
                transformación. Achicarlo con un ancho menor daría otro diseño
                —las consultas de medios cambiarían de rama— y esta pantalla
                quedaría mostrando algo que ningún cliente ve. */}
            <div className={styles.marco}>
              <div className={styles.lienzo}>
                <PlantillaMipuesto
                  datos={{
                    ...demo.datos,
                    negocio: { ...demo.datos.negocio, patronFondo: conPatron },
                  }}
                  paleta={paleta}
                />
              </div>
            </div>
          </figure>
        ))}
      </div>
    </main>
  );
}
