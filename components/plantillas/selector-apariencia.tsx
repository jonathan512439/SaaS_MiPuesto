"use client";

import { useState, type FormEvent } from "react";

import {
  DEFINICIONES_PALETAS,
  DEFINICIONES_PLANTILLAS,
  DEFINICIONES_TARJETAS,
  TARJETAS_POR_PLANTILLA,
  tarjetaValidaPara,
  type PaletaId,
  type PlantillaId,
  type TarjetaId,
} from "../../lib/apariencia";
import { patronDeRubro } from "../../lib/patrones-fondo";
import type { DatosPlantilla } from "../../lib/plantillas/tipos";
import temaStyles from "../templates/tema-catalogo.module.css";
import { VISTAS_PLANTILLA } from "../templates/vistas";
import { Boton, useAvisos } from "../ui";
import styles from "./selector-apariencia.module.css";
import { PasoNumerado } from "../dashboard/paso-numerado";

type PropiedadesSelector = {
  datos: DatosPlantilla;
  plantillaInicial: PlantillaId;
  tarjetaInicial: TarjetaId;
  paletaInicial: PaletaId;
  patronInicial: boolean;
};

/* El mismo registro compartido que usa el catálogo público. Ver el comentario en
   `catalogo-interactivo.tsx`: había tres copias de este mapa. */
const VISTAS = VISTAS_PLANTILLA;

export function SelectorApariencia({
  datos,
  plantillaInicial,
  tarjetaInicial,
  paletaInicial,
  patronInicial,
}: PropiedadesSelector) {
  const [plantillaElegida, setPlantillaElegida] = useState(plantillaInicial);
  const [tarjetaElegida, setTarjetaElegida] = useState(tarjetaInicial);
  const [tarjetaGuardada, setTarjetaGuardada] = useState(tarjetaInicial);
  const [paletaElegida, setPaletaElegida] = useState(paletaInicial);
  const [plantillaGuardada, setPlantillaGuardada] = useState(plantillaInicial);
  const [paletaGuardada, setPaletaGuardada] = useState(paletaInicial);
  const [patronElegido, setPatronElegido] = useState(patronInicial);
  const [patronGuardado, setPatronGuardado] = useState(patronInicial);
  const [guardando, setGuardando] = useState(false);
  const { mostrarAviso } = useAvisos();

  const VistaPrevia = VISTAS[plantillaElegida];
  /* La forma se corrige al vuelo con la plantilla elegida, no al guardar: si el
     dueño tenía «retrato» y se pasa a Feria, tiene que ver de inmediato con qué
     se queda. Guardar y descubrirlo después es la clase de sorpresa que hace
     que nadie confíe en el panel. */
  const tarjetaVigente = tarjetaValidaPara(plantillaElegida, tarjetaElegida);
  const formasDisponibles = TARJETAS_POR_PLANTILLA[plantillaElegida];
  const hayCambioPendiente =
    plantillaElegida !== plantillaGuardada ||
    tarjetaVigente !== tarjetaGuardada ||
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
          tarjeta_id: tarjetaVigente,
          paleta_id: paletaElegida,
          patron_fondo: patronElegido,
        }),
      });
      const resultado = (await respuesta.json()) as {
        error?: string;
        plantilla_id?: PlantillaId;
        tarjeta_id?: TarjetaId;
        paleta_id?: PaletaId;
        patron_fondo?: boolean;
      };

      if (!respuesta.ok || !resultado.plantilla_id || !resultado.paleta_id) {
        throw new Error(resultado.error || "No se pudo guardar la apariencia.");
      }

      setPlantillaGuardada(resultado.plantilla_id);
      /* Se toma la que devolvió el servidor, no la que se mandó: si allá se
         corrigió, acá tiene que verse la corregida. */
      if (resultado.tarjeta_id) {
        setTarjetaGuardada(resultado.tarjeta_id);
        setTarjetaElegida(resultado.tarjeta_id);
      }
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
        <legend className={styles.leyendaOculta}>Elige la estructura</legend>
        <PasoNumerado numero={1} titulo="Elige la estructura" />
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
        <legend className={styles.leyendaOculta}>Elige la forma de tus productos</legend>
        <PasoNumerado numero={2} titulo="Elige la forma de tus productos" />
        <p className={styles.ayuda}>
          Es cómo se presenta cada producto dentro de la estructura que elegiste. Solo
          aparecen las formas que esa estructura sabe dibujar.
        </p>
        <div className={styles.plantillas}>
          {DEFINICIONES_TARJETAS.filter((tarjeta) =>
            formasDisponibles.includes(tarjeta.id),
          ).map((tarjeta) => {
            const elegida = tarjetaVigente === tarjeta.id;
            return (
              <label
                className={elegida ? styles.opcionElegida : styles.opcion}
                htmlFor={`tarjeta-${tarjeta.id}`}
                key={tarjeta.id}
              >
                <input
                  checked={elegida}
                  id={`tarjeta-${tarjeta.id}`}
                  name="tarjeta"
                  onChange={() => {
                    setTarjetaElegida(tarjeta.id);
                  }}
                  type="radio"
                  value={tarjeta.id}
                />
                <strong>{tarjeta.nombre}</strong>
                <span>{tarjeta.descripcion}</span>
                <small>{elegida ? "Seleccionada" : "Ver esta forma"}</small>
              </label>
            );
          })}
        </div>
        {/* Con una sola forma no hay nada que elegir, y una lista de un elemento
            parece un error. Se dice por qué. */}
        {formasDisponibles.length === 1 ? (
          <p className={styles.ayuda}>
            Esta estructura tiene una sola forma, que es la que mejor le queda.
          </p>
        ) : null}
      </fieldset>

      <fieldset className={styles.grupo} disabled={guardando}>
        <legend className={styles.leyendaOculta}>Elige la paleta de colores</legend>
        <PasoNumerado numero={3} titulo="Elige la paleta de colores" />
        <p className={styles.ayuda}>
          Cualquiera de estas paletas funciona con cualquier estructura y cumple contraste AA.
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
        <PasoNumerado numero={4} titulo="Elige el fondo" />
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
            <p>5. Revisa el resultado</p>
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
          <VistaPrevia
            datos={{ ...datos, negocio: { ...datos.negocio, tarjeta: tarjetaVigente } }}
            paleta={paletaElegida}
          />
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
