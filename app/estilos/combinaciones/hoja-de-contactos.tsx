"use client";

import { useState } from "react";

import { DEFINICIONES_PALETAS, DEFINICIONES_PLANTILLAS, PALETAS, PLANTILLAS } from "../../../lib/apariencia";
import type { PaletaId, PlantillaId } from "../../../lib/apariencia";
import { DEMOS_POR_RUBRO } from "../../../lib/plantillas/demos-rubro";
import { VISTAS_PLANTILLA } from "../../../components/templates/vistas";
import styles from "./hoja-de-contactos.module.css";

/* Las veintiocho combinaciones de plantilla y paleta, a la vez y en la misma
   pantalla.
 *
 * Existe porque las pruebas **no ven** que algo quedó feo. Comprueban contraste
 * y tokens, y las dos cosas pueden estar perfectas mientras una tarjeta se
 * desarma en la paleta oscura o un botón desaparece sobre su propio fondo.
 * Cuatro diseños por siete colores son veintiocho pantallas que nadie va a
 * abrir de a una, y por eso nadie las mira: la que se rompe se descubre cuando
 * la abre un cliente.
 *
 * Es una herramienta de trabajo, no una pantalla de producto. Vale medio día y
 * evita que cada cambio visual se pague veintiocho veces. */

type Modo = "paletas" | "plantillas" | "todo";

export function HojaDeContactos() {
  const [rubroId, setRubroId] = useState(DEMOS_POR_RUBRO[0].id);
  const [modo, setModo] = useState<Modo>("paletas");
  const [plantillaFija, setPlantillaFija] = useState<PlantillaId>("clasica");
  const [paletaFija, setPaletaFija] = useState<PaletaId>("mercado");
  const [conPatron, setConPatron] = useState(true);

  const demo = DEMOS_POR_RUBRO.find(({ id }) => id === rubroId) ?? DEMOS_POR_RUBRO[0];

  /* Se arma la lista de celdas según el modo en vez de tener tres bloques de
     dibujo distintos: la celda es siempre la misma y lo único que cambia es
     cuántas hay. */
  const celdas: Array<{ plantilla: PlantillaId; paleta: PaletaId }> =
    modo === "paletas"
      ? PALETAS.map((paleta) => ({ plantilla: plantillaFija, paleta }))
      : modo === "plantillas"
        ? PLANTILLAS.map((plantilla) => ({ plantilla, paleta: paletaFija }))
        : PLANTILLAS.flatMap((plantilla) => PALETAS.map((paleta) => ({ plantilla, paleta })));

  const nombrePlantilla = (id: PlantillaId) =>
    DEFINICIONES_PLANTILLAS.find((plantilla) => plantilla.id === id)?.nombre ?? id;
  const nombrePaleta = (id: PaletaId) =>
    DEFINICIONES_PALETAS.find((paleta) => paleta.id === id)?.nombre ?? id;

  return (
    <main className={styles.pagina}>
      <header className={styles.encabezado}>
        <h1>Hoja de contactos</h1>
        <p>
          Las {PLANTILLAS.length * PALETAS.length} combinaciones de diseño y color, juntas. Después
          de cualquier cambio visual, se recorre esta pantalla: es lo único que muestra lo que las
          pruebas no pueden ver.
        </p>
      </header>

      <div className={styles.controles}>
        <fieldset>
          <legend>Qué comparar</legend>
          <div className={styles.opciones}>
            {(
              [
                ["paletas", `Un diseño en sus ${PALETAS.length} colores`],
                ["plantillas", `Un color en los ${PLANTILLAS.length} diseños`],
                ["todo", `Las ${PLANTILLAS.length * PALETAS.length}`],
              ] as const
            ).map(([valor, etiqueta]) => (
              <label className={modo === valor ? styles.elegida : styles.opcion} key={valor}>
                <input
                  checked={modo === valor}
                  name="modo"
                  onChange={() => setModo(valor)}
                  type="radio"
                />
                {etiqueta}
              </label>
            ))}
          </div>
        </fieldset>

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

        {modo === "paletas" ? (
          <fieldset>
            <legend>Qué diseño</legend>
            <div className={styles.opciones}>
              {DEFINICIONES_PLANTILLAS.map(({ id, nombre }) => (
                <label className={plantillaFija === id ? styles.elegida : styles.opcion} key={id}>
                  <input
                    checked={plantillaFija === id}
                    name="plantilla"
                    onChange={() => setPlantillaFija(id)}
                    type="radio"
                  />
                  {nombre}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {modo === "plantillas" ? (
          <fieldset>
            <legend>Qué color</legend>
            <div className={styles.opciones}>
              {DEFINICIONES_PALETAS.map(({ id, nombre }) => (
                <label className={paletaFija === id ? styles.elegida : styles.opcion} key={id}>
                  <input
                    checked={paletaFija === id}
                    name="paleta"
                    onChange={() => setPaletaFija(id)}
                    type="radio"
                  />
                  {nombre}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

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

      <div className={modo === "todo" ? styles.grillaCompleta : styles.grilla}>
        {celdas.map(({ plantilla, paleta }) => {
          const Vista = VISTAS_PLANTILLA[plantilla];
          return (
            <figure className={styles.celda} key={`${plantilla}-${paleta}`}>
              <figcaption>
                <strong>{nombrePlantilla(plantilla)}</strong>
                <span>{nombrePaleta(paleta)}</span>
              </figcaption>
              {/* El contenido se dibuja a tamaño de teléfono y se achica con una
                  transformación. Achicarlo con un ancho menor daría otro diseño
                  —las consultas de medios cambiarían de rama— y esta pantalla
                  quedaría mostrando algo que ningún cliente ve. */}
              <div className={styles.marco}>
                <div className={styles.lienzo}>
                  <Vista
                    datos={{
                      ...demo.datos,
                      negocio: { ...demo.datos.negocio, patronFondo: conPatron },
                    }}
                    paleta={paleta}
                  />
                </div>
              </div>
            </figure>
          );
        })}
      </div>
    </main>
  );
}
