"use client";

import dynamic from "next/dynamic";
import { useState, type ComponentType } from "react";

import { DEFINICIONES_PALETAS, DEFINICIONES_PLANTILLAS } from "../../lib/apariencia";
import type { PaletaId, PlantillaId } from "../../lib/apariencia";
import { crearDatosDemoPlantilla } from "../../lib/plantillas/datos-demo";
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

/* Los negocios de ejemplo cambian con la plantilla porque cada una nace de un
   rubro distinto: mostrar la carta editorial con nombre de tienda de ropa
   desperdicia justo el argumento que sostiene el selector. */
const EJEMPLOS: Record<PlantillaId, Parameters<typeof crearDatosDemoPlantilla>[0]> = {
  clasica: {
    nombre: "Sabor Camba",
    descripcion: "Cocina cruceña de olla, servida como en casa desde 1998.",
    telefonoWhatsapp: "70000000",
    tipoNegocio: "tienda_virtual",
  },
  moderna: {
    nombre: "Tienda Kantuta",
    descripcion: "Ropa y accesorios elegidos uno por uno en la feria.",
    telefonoWhatsapp: "70000000",
    tipoNegocio: "tienda_virtual",
  },
  minimal: {
    nombre: "Barbería Central",
    descripcion: "Cortes clásicos y arreglo de barba, con turno reservado.",
    telefonoWhatsapp: "70000000",
    tipoNegocio: "catalogo_cta",
  },
  feria: {
    nombre: "Frutas Doña Rosa",
    descripcion: "Puesto 42 del mercado, fruta de temporada al peso.",
    telefonoWhatsapp: "70000000",
    tipoNegocio: "tienda_virtual",
  },
};

export function MuestraPlantillas() {
  const [plantilla, setPlantilla] = useState<PlantillaId>("moderna");
  const [paleta, setPaleta] = useState<PaletaId>("mercado");
  const Vista = VISTAS[plantilla];

  const definicion = DEFINICIONES_PLANTILLAS.find(({ id }) => id === plantilla);

  return (
    <div className={styles.muestra}>
      <div className={styles.controles}>
        <fieldset>
          <div className={styles.tituloGrupo}>
            <legend>Estructura</legend>
            {/* El enfoque de la elegida se lee al lado del título y no dentro de
                cada opción: repetirlo cuatro veces convierte el selector en un
                párrafo. */}
            <p aria-live="polite">{definicion?.enfoque}</p>
          </div>
          <div className={styles.opciones}>
            {DEFINICIONES_PLANTILLAS.map(({ id, nombre, recomendacion }) => (
              <label
                className={plantilla === id ? styles.opcionElegida : styles.opcion}
                key={id}
              >
                <input
                  checked={plantilla === id}
                  name="muestra-plantilla"
                  onChange={() => setPlantilla(id)}
                  type="radio"
                  value={id}
                />
                <strong>{nombre}</strong>
                <span>{recomendacion}</span>
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
              <label
                className={paleta === id ? styles.paletaElegida : styles.paleta}
                key={id}
              >
                <input
                  checked={paleta === id}
                  name="muestra-paleta"
                  onChange={() => setPaleta(id)}
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
          <Vista datos={crearDatosDemoPlantilla(EJEMPLOS[plantilla])} paleta={paleta} />
        </div>
      </div>
    </div>
  );
}
