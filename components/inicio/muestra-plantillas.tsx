"use client";

import { useState } from "react";

import { DEFINICIONES_PALETAS } from "../../lib/apariencia";
import type { PaletaId } from "../../lib/apariencia";
import { DEMOS_POR_RUBRO } from "../../lib/plantillas/demos-rubro";
import temaStyles from "../templates/tema-catalogo.module.css";
import { PlantillaMipuesto } from "../templates/mipuesto/plantilla-mipuesto";
import styles from "./muestra-plantillas.module.css";

/* Se entra por rubro: un comerciante sabe a qué se dedica, y lo que quiere ver
   es su propio catálogo, no una muestra genérica.

   El diseño es uno solo, así que lo que se elige acá es el color —y quedan los
   diez a la vista, porque si no se muestran nadie se entera de que puede
   elegir—. Lo que de verdad cambia entre un rubro y otro son sus productos, sus
   categorías y sus campos, y eso se ve al cambiar de rubro. */
export function MuestraPlantillas() {
  const [rubroId, setRubroId] = useState(DEMOS_POR_RUBRO[0].id);
  const [paletaElegida, setPaletaElegida] = useState<PaletaId | null>(null);

  const demo = DEMOS_POR_RUBRO.find(({ id }) => id === rubroId) ?? DEMOS_POR_RUBRO[0];
  const paleta = paletaElegida ?? demo.paleta;

  return (
    <div className={styles.muestra}>
      <div className={styles.controles}>
        <fieldset>
          <div className={styles.tituloGrupo}>
            <legend>Tu rubro</legend>
            <p aria-live="polite">{demo.gancho}</p>
          </div>
          <div className={styles.opciones}>
            {DEMOS_POR_RUBRO.map(({ id, rubro, datos }) => (
              <label className={rubroId === id ? styles.opcionElegida : styles.opcion} key={id}>
                <input
                  checked={rubroId === id}
                  name="muestra-rubro"
                  onChange={() => {
                    setRubroId(id);
                    /* Al cambiar de rubro vuelve el color recomendado: si se
                       conservara el elegido antes, la muestra siguiente saldría
                       con una combinación que nadie eligió. */
                    setPaletaElegida(null);
                  }}
                  type="radio"
                  value={id}
                />
                <strong>{rubro}</strong>
                <span>{datos.negocio.nombre}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <div className={styles.tituloGrupo}>
            <legend>Color</legend>
            <p>Son {DEFINICIONES_PALETAS.length}, y se cambian cuando quieras.</p>
          </div>
          <div className={styles.paletas}>
            {DEFINICIONES_PALETAS.map(({ id, nombre }) => (
              <label className={paleta === id ? styles.paletaElegida : styles.paleta} key={id}>
                <input
                  checked={paleta === id}
                  name="muestra-paleta"
                  onChange={() => setPaletaElegida(id)}
                  type="radio"
                  value={id}
                />
                <span aria-hidden="true" className={temaStyles.tema} data-paleta={id} />
                {nombre}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className={styles.marco}>
        <div aria-hidden="true" className={styles.barraTelefono}>
          <span>9:41</span>
          <span className={styles.muesca} />
          <span className={styles.bateria} />
        </div>
        <div className={styles.lienzo}>
          <PlantillaMipuesto datos={demo.datos} paleta={paleta} />
        </div>
      </div>
    </div>
  );
}
