"use client";

import dynamic from "next/dynamic";
import { useState, type ComponentType, type FormEvent } from "react";

import {
  DEFINICIONES_PALETAS,
  DEFINICIONES_PLANTILLAS,
  type PaletaId,
  type PlantillaId,
} from "../../lib/apariencia";
import { patronDeRubro } from "../../lib/patrones-fondo";
import type { DatosPlantilla, PropiedadesPlantilla } from "../../lib/plantillas/tipos";
import temaStyles from "../templates/tema-catalogo.module.css";
import { Boton, Esqueleto, useAvisos } from "../ui";
import styles from "./selector-apariencia.module.css";

type PropiedadesSelector = {
  datos: DatosPlantilla;
  plantillaInicial: PlantillaId;
  paletaInicial: PaletaId;
  patronInicial: boolean;
};

/* El chunk de cada plantilla baja al elegirla. Sin este relleno el area de la
   vista previa queda en blanco y el alto salta cuando llega el modulo. */
function VistaPreviaCargando() {
  return (
    <div aria-hidden="true" className={styles.cargandoVista}>
      <Esqueleto variante="imagen" />
      <Esqueleto variante="titulo" />
      <Esqueleto />
      <Esqueleto />
    </div>
  );
}

const VISTAS: Record<PlantillaId, ComponentType<PropiedadesPlantilla>> = {
  clasica: dynamic(
    () =>
      import("../templates/clasica/plantilla-clasica").then((modulo) => modulo.PlantillaClasica),
    { loading: VistaPreviaCargando },
  ),
  moderna: dynamic(
    () =>
      import("../templates/moderna/plantilla-moderna").then((modulo) => modulo.PlantillaModerna),
    { loading: VistaPreviaCargando },
  ),
  minimal: dynamic(
    () =>
      import("../templates/minimal/plantilla-minimal").then((modulo) => modulo.PlantillaMinimal),
    { loading: VistaPreviaCargando },
  ),
  feria: dynamic(
    () =>
      import("../templates/feria/plantilla-feria").then((modulo) => modulo.PlantillaFeria),
    { loading: VistaPreviaCargando },
  ),
};

export function SelectorApariencia({
  datos,
  plantillaInicial,
  paletaInicial,
  patronInicial,
}: PropiedadesSelector) {
  const [plantillaElegida, setPlantillaElegida] = useState(plantillaInicial);
  const [paletaElegida, setPaletaElegida] = useState(paletaInicial);
  const [plantillaGuardada, setPlantillaGuardada] = useState(plantillaInicial);
  const [paletaGuardada, setPaletaGuardada] = useState(paletaInicial);
  const [patronElegido, setPatronElegido] = useState(patronInicial);
  const [patronGuardado, setPatronGuardado] = useState(patronInicial);
  const [guardando, setGuardando] = useState(false);
  const { mostrarAviso } = useAvisos();

  const VistaPrevia = VISTAS[plantillaElegida];
  const hayCambioPendiente =
    plantillaElegida !== plantillaGuardada ||
    paletaElegida !== paletaGuardada ||
    patronElegido !== patronGuardado;

  async function guardarApariencia(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    try {
      const respuesta = await fetch("/api/negocios/plantilla", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantilla_id: plantillaElegida,
          paleta_id: paletaElegida,
          patron_fondo: patronElegido,
        }),
      });
      const resultado = (await respuesta.json()) as {
        error?: string;
        plantilla_id?: PlantillaId;
        paleta_id?: PaletaId;
        patron_fondo?: boolean;
      };

      if (!respuesta.ok || !resultado.plantilla_id || !resultado.paleta_id) {
        throw new Error(resultado.error || "No se pudo guardar la apariencia.");
      }

      setPlantillaGuardada(resultado.plantilla_id);
      setPaletaGuardada(resultado.paleta_id);
      setPatronGuardado(resultado.patron_fondo !== false);
      setPatronElegido(resultado.patron_fondo !== false);
      mostrarAviso({ titulo: "Apariencia guardada", variante: "exito" });
    } catch (causa) {
      mostrarAviso({
        titulo: "No se pudo guardar la apariencia",
        mensaje: causa instanceof Error ? causa.message : "Intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className={styles.formulario} onSubmit={guardarApariencia}>
      <fieldset className={styles.grupo} disabled={guardando}>
        <legend className={styles.leyenda}>1. Elige la estructura</legend>
        <p className={styles.ayuda}>
          La plantilla cambia la tipografía, la navegación, los botones y la forma de presentar
          tus productos. No modifica la información de tu negocio.
        </p>
        <div className={styles.plantillas}>
          {DEFINICIONES_PLANTILLAS.map((plantilla) => {
            const elegida = plantillaElegida === plantilla.id;
            return (
              <label
                className={elegida ? styles.opcionElegida : styles.opcion}
                htmlFor={`plantilla-${plantilla.id}`}
                key={plantilla.id}
              >
                <input
                  checked={elegida}
                  id={`plantilla-${plantilla.id}`}
                  name="plantilla"
                  onChange={() => {
                    setPlantillaElegida(plantilla.id);
                  }}
                  type="radio"
                  value={plantilla.id}
                />
                <span className={styles.numero}>{plantilla.enfoque}</span>
                <strong>{plantilla.nombre}</strong>
                <span>{plantilla.recomendacion}</span>
                <small>{elegida ? "Seleccionada" : "Ver esta estructura"}</small>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.grupo} disabled={guardando}>
        <legend className={styles.leyenda}>2. Elige la paleta de colores</legend>
        <p className={styles.ayuda}>
          Cualquiera de estas paletas funciona con las tres plantillas y cumple contraste AA.
        </p>
        <div className={styles.paletas}>
          {DEFINICIONES_PALETAS.map((paleta) => {
            const elegida = paletaElegida === paleta.id;
            return (
              <label
                className={elegida ? styles.paletaElegida : styles.paleta}
                htmlFor={`paleta-${paleta.id}`}
                key={paleta.id}
              >
                <input
                  checked={elegida}
                  id={`paleta-${paleta.id}`}
                  name="paleta"
                  onChange={() => {
                    setPaletaElegida(paleta.id);
                  }}
                  type="radio"
                  value={paleta.id}
                />
                <span
                  aria-hidden="true"
                  className={`${temaStyles.tema} ${styles.muestraPaleta}`}
                  data-paleta={paleta.id}
                >
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <strong>{paleta.nombre}</strong>
                <span>{paleta.descripcion}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.grupo} disabled={guardando}>
        <legend className={styles.leyenda}>3. Elige el fondo</legend>
        <p className={styles.ayuda}>
          El catálogo lleva detrás un dibujo tenue con objetos de tu rubro. Apagalo si
          preferís un fondo liso; tu panel de administración no cambia.
        </p>
        <label className={styles.interruptor} htmlFor="patron-fondo">
          <input
            checked={patronElegido}
            id="patron-fondo"
            name="patron_fondo"
            onChange={(evento) => {
              setPatronElegido(evento.target.checked);
            }}
            type="checkbox"
          />
          <span>
            <strong>Mostrar el fondo con dibujos</strong>
            <span>Se ve en el catálogo que abren tus clientes.</span>
          </span>
        </label>
      </fieldset>

      <section className={styles.demostracion} aria-labelledby="titulo-demostracion">
        <header>
          <div>
            <p>4. Revisa el resultado</p>
            <h2 id="titulo-demostracion">Así se verá la experiencia de tus clientes</h2>
          </div>
          <span>Vista completa de demostración</span>
        </header>
        {/* El marco lleva `.tema` y las dos marcas porque el patrón se pinta con
            `.tema[data-patron] > article`: sin el envoltorio, la vista previa
            mostraría todo menos el fondo, que es justo lo que se está eligiendo. */}
        <div
          className={`${temaStyles.tema} ${styles.marcoVista}`}
          data-paleta={paletaElegida}
          data-patron={patronElegido ? patronDeRubro(datos.negocio.rubro) : undefined}
        >
          <VistaPrevia datos={datos} paleta={paletaElegida} />
        </div>
      </section>

      <div className={styles.barra}>
        <div className={styles.acciones}>
          <p className={hayCambioPendiente ? styles.avisoPendiente : styles.avisoCambio}>
            {hayCambioPendiente
              ? "Tienes cambios de apariencia sin guardar."
              : "Esta es la apariencia guardada actualmente."}
          </p>
          <Boton cargando={guardando} disabled={!hayCambioPendiente} type="submit">
            Guardar apariencia
          </Boton>
        </div>
      </div>
    </form>
  );
}
