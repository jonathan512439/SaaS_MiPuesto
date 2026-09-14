"use client";

import { useState, type FormEvent } from "react";

import {
  DEFINICIONES_PALETAS,
  type PaletaId,
  type PlantillaId,
  type TarjetaId,
} from "../../lib/apariencia";
import {
  OPACIDAD_PATRON_PREDETERMINADA,
  PASOS_OPACIDAD_PATRON,
  patronDeRubro,
} from "../../lib/patrones-fondo";
import type { DatosPlantilla } from "../../lib/plantillas/tipos";
import temaStyles from "../templates/tema-catalogo.module.css";
import { PlantillaMipuesto } from "../templates/mipuesto/plantilla-mipuesto";
import { Boton, useAvisos } from "../ui";
import styles from "./selector-apariencia.module.css";
import { PasoNumerado } from "../dashboard/paso-numerado";

type PropiedadesSelector = {
  datos: DatosPlantilla;
  plantillaInicial: PlantillaId;
  tarjetaInicial: TarjetaId;
  paletaInicial: PaletaId;
  patronInicial: boolean;
  opacidadInicial: number;
};

export function SelectorApariencia({
  datos,
  plantillaInicial,
  tarjetaInicial,
  paletaInicial,
  patronInicial,
  opacidadInicial,
}: PropiedadesSelector) {
  const [paletaElegida, setPaletaElegida] = useState(paletaInicial);
  const [paletaGuardada, setPaletaGuardada] = useState(paletaInicial);
  const [patronElegido, setPatronElegido] = useState(patronInicial);
  const [patronGuardado, setPatronGuardado] = useState(patronInicial);
  const [opacidadElegida, setOpacidadElegida] = useState(opacidadInicial);
  const [opacidadGuardada, setOpacidadGuardada] = useState(opacidadInicial);
  const [guardando, setGuardando] = useState(false);
  const { mostrarAviso } = useAvisos();

  /* El diseño del catálogo es único: ya no se elige estructura ni forma de
     tarjeta. Lo editable es la paleta y el fondo. Las columnas plantilla_id y
     tarjeta_producto siguen en la base —se podan aparte— y se reenvían tal como
     llegaron, para no tocar el endpoint antes de tiempo. */
  const hayCambioPendiente =
    paletaElegida !== paletaGuardada ||
    patronElegido !== patronGuardado ||
    opacidadElegida !== opacidadGuardada;

  async function guardarApariencia(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    try {
      const respuesta = await fetch("/api/negocios/plantilla", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          /* Se reenvían los valores con los que llegó: la elección de
             estructura y forma se retiró, pero las columnas siguen y el endpoint
             las espera hasta la poda. */
          plantilla_id: plantillaInicial,
          tarjeta_id: tarjetaInicial,
          paleta_id: paletaElegida,
          patron_fondo: patronElegido,
          patron_opacidad: opacidadElegida,
        }),
      });
      const resultado = (await respuesta.json()) as {
        error?: string;
        plantilla_id?: PlantillaId;
        tarjeta_id?: TarjetaId;
        paleta_id?: PaletaId;
        patron_fondo?: boolean;
        patron_opacidad?: number;
      };

      if (!respuesta.ok || !resultado.plantilla_id || !resultado.paleta_id) {
        throw new Error(resultado.error || "No se pudo guardar la apariencia.");
      }

      setPaletaGuardada(resultado.paleta_id);
      setPatronGuardado(resultado.patron_fondo !== false);
      setPatronElegido(resultado.patron_fondo !== false);
      const opacidad = resultado.patron_opacidad ?? OPACIDAD_PATRON_PREDETERMINADA;
      setOpacidadGuardada(opacidad);
      setOpacidadElegida(opacidad);
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
        <legend className={styles.leyendaOculta}>Elige la paleta de colores</legend>
        <PasoNumerado numero={1} titulo="Elige la paleta de colores" />
        <p className={styles.ayuda}>
          Tiñe la cabecera, el fondo y las tarjetas. Todas cumplen contraste AA.
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
        <legend className={styles.leyendaOculta}>Elige el fondo</legend>
        <PasoNumerado numero={2} titulo="Elige el fondo" />
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

        {/* La intensidad solo aparece con el fondo encendido: un control que
            regula algo apagado es un control que no hace nada. */}
        {patronElegido ? (
          <label className={styles.intensidad} htmlFor="patron-opacidad">
            <span>
              <strong>Cuánto se nota</strong>
              <span>Más a la derecha, más marcado. Arriba de 30 taparía el texto.</span>
            </span>
            <input
              id="patron-opacidad"
              list="pasos-opacidad"
              max={PASOS_OPACIDAD_PATRON[PASOS_OPACIDAD_PATRON.length - 1]}
              min={PASOS_OPACIDAD_PATRON[0]}
              name="patron_opacidad"
              onChange={(evento) => setOpacidadElegida(Number(evento.target.value))}
              step={3}
              type="range"
              value={opacidadElegida}
            />
            <output htmlFor="patron-opacidad">{opacidadElegida} %</output>
            <datalist id="pasos-opacidad">
              {PASOS_OPACIDAD_PATRON.map((paso) => (
                <option key={paso} value={paso} />
              ))}
            </datalist>
          </label>
        ) : null}
      </fieldset>

      <section className={styles.demostracion} aria-labelledby="titulo-demostracion">
        <header>
          <div>
            <p>3. Revisa el resultado</p>
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
          data-patron-opacidad={patronElegido ? opacidadElegida : undefined}
        >
          <PlantillaMipuesto datos={datos} paleta={paletaElegida} />
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
