"use client";

import dynamic from "next/dynamic";
import { useState, type ComponentType } from "react";

import { DEFINICIONES_PALETAS } from "../../lib/apariencia";
import type { PaletaId, PlantillaId } from "../../lib/apariencia";
import { DEMOS_POR_RUBRO } from "../../lib/plantillas/demos-rubro";
import type { PropiedadesPlantilla } from "../../lib/plantillas/tipos";
import temaStyles from "../templates/tema-catalogo.module.css";
import { Esqueleto } from "../ui";
import styles from "./muestra-plantillas.module.css";

function VistaCargando() {
  return (
    <div aria-hidden="true" className={styles.cargando}>
      <Esqueleto variante="imagen" />
      <Esqueleto variante="titulo" />
      <Esqueleto />
    </div>
  );
}

const VISTAS: Record<PlantillaId, ComponentType<PropiedadesPlantilla>> = {
  clasica: dynamic(
    () =>
      import("../templates/clasica/plantilla-clasica").then((m) => m.PlantillaClasica),
    { loading: VistaCargando },
  ),
  moderna: dynamic(
    () =>
      import("../templates/moderna/plantilla-moderna").then((m) => m.PlantillaModerna),
    { loading: VistaCargando },
  ),
  minimal: dynamic(
    () =>
      import("../templates/minimal/plantilla-minimal").then((m) => m.PlantillaMinimal),
    { loading: VistaCargando },
  ),
  feria: dynamic(
    () => import("../templates/feria/plantilla-feria").then((m) => m.PlantillaFeria),
    { loading: VistaCargando },
  ),
};

/* Se elige por rubro y no por «estructura»: un comerciante sabe a qué se dedica
   y no tiene por qué saber qué es una plantilla. Cada rubro trae la combinación
   que le corresponde, con productos y precios de su oficio; el color queda
   suelto porque es lo único que sí se elige por gusto. */
export function MuestraPlantillas() {
  const [rubroId, setRubroId] = useState(DEMOS_POR_RUBRO[0].id);
  const [paletaElegida, setPaletaElegida] = useState<PaletaId | null>(null);

  const demo = DEMOS_POR_RUBRO.find(({ id }) => id === rubroId) ?? DEMOS_POR_RUBRO[0];
  const paleta = paletaElegida ?? demo.paleta;
  const Vista = VISTAS[demo.plantilla];

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
                    /* Al cambiar de rubro vuelve su color recomendado: si se
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
          <Vista datos={demo.datos} paleta={paleta} />
        </div>
      </div>
    </div>
  );
}
