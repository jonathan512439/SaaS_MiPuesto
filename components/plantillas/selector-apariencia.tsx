"use client";

import { useMemo, useState, type FormEvent } from "react";

import {
  DEFINICIONES_FORMAS,
  DEFINICIONES_PALETAS,
  type FormaTarjeta,
  type PaletaId,
} from "../../lib/apariencia";
import {
  OPACIDAD_PATRON_PREDETERMINADA,
  PASOS_OPACIDAD_PATRON,
  iconosDePatron,
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
  paletaInicial: PaletaId;
  patronInicial: boolean;
  opacidadInicial: number;
  formaInicial: FormaTarjeta;
};

export function SelectorApariencia({
  datos,
  paletaInicial,
  patronInicial,
  opacidadInicial,
  formaInicial,
}: PropiedadesSelector) {
  const [paletaElegida, setPaletaElegida] = useState(paletaInicial);
  const [paletaGuardada, setPaletaGuardada] = useState(paletaInicial);
  const [patronElegido, setPatronElegido] = useState(patronInicial);
  const [patronGuardado, setPatronGuardado] = useState(patronInicial);
  const [opacidadElegida, setOpacidadElegida] = useState(opacidadInicial);
  const [opacidadGuardada, setOpacidadGuardada] = useState(opacidadInicial);
  const [formaElegida, setFormaElegida] = useState(formaInicial);
  const [formaGuardada, setFormaGuardada] = useState(formaInicial);
  const [guardando, setGuardando] = useState(false);
  const { mostrarAviso } = useAvisos();

  /* La vista previa con la forma que se está eligiendo, no con la guardada. */
  const datosConForma = useMemo(
    () => ({ ...datos, negocio: { ...datos.negocio, formaTarjeta: formaElegida } }),
    [datos, formaElegida],
  );

  /* El diseño del catálogo es único: lo editable es la paleta, la forma de las
     tarjetas y el fondo. */
  const hayCambioPendiente =
    paletaElegida !== paletaGuardada ||
    formaElegida !== formaGuardada ||
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
          paleta_id: paletaElegida,
          patron_fondo: patronElegido,
          patron_opacidad: opacidadElegida,
          forma_tarjeta: formaElegida,
        }),
      });
      const resultado = (await respuesta.json()) as {
        error?: string;
        paleta_id?: PaletaId;
        patron_fondo?: boolean;
        patron_opacidad?: number;
        forma_tarjeta?: FormaTarjeta;
      };

      if (!respuesta.ok || !resultado.paleta_id) {
        throw new Error(resultado.error || "No se pudo guardar la apariencia.");
      }

      setPaletaGuardada(resultado.paleta_id);
      setPatronGuardado(resultado.patron_fondo !== false);
      setPatronElegido(resultado.patron_fondo !== false);
      const opacidad = resultado.patron_opacidad ?? OPACIDAD_PATRON_PREDETERMINADA;
      setOpacidadGuardada(opacidad);
      setOpacidadElegida(opacidad);
      const forma = resultado.forma_tarjeta ?? formaElegida;
      setFormaGuardada(forma);
      setFormaElegida(forma);
      mostrarAviso({ titulo: "Apariencia guardada", variante: "exito" });
    } catch (causa) {
      mostrarAviso({
        titulo: "No se pudo guardar la apariencia",
        mensaje: causa instanceof Error ? causa.message : "Intentá nuevamente.",
        variante: "error",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className={styles.formulario} onSubmit={guardarApariencia}>
      <fieldset className={styles.grupo} disabled={guardando}>
        <legend className={styles.leyendaOculta}>Elegí la paleta de colores</legend>
        <PasoNumerado numero={1} titulo="Elegí la paleta de colores" />
        <p className={styles.ayuda}>Tiñe la cabecera, el fondo y las tarjetas.</p>
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
                {/* Solo el nombre. La descripción —«cacao profundo con acento de
                    ladrillo»— describía con palabras lo que las cuatro muestras
                    de color ya están mostrando, y con dieciséis paletas eso son
                    dieciséis renglones de texto que hay que leer para elegir
                    algo que se elige mirando. */}
                <strong>{paleta.nombre}</strong>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.grupo} disabled={guardando}>
        <legend className={styles.leyendaOculta}>Cómo se ven tus productos</legend>
        <PasoNumerado numero={2} titulo="Cómo se ven tus productos" />
        <p className={styles.ayuda}>
          Solo cambia el aspecto: lo que tus clientes pueden pedir es lo mismo en las tres.
        </p>
        <div className={styles.formas}>
          {DEFINICIONES_FORMAS.map((forma) => {
            const elegida = formaElegida === forma.id;
            return (
              <label
                className={elegida ? styles.formaElegida : styles.forma}
                htmlFor={`forma-${forma.id}`}
                key={forma.id}
              >
                <input
                  checked={elegida}
                  id={`forma-${forma.id}`}
                  name="forma_tarjeta"
                  onChange={() => setFormaElegida(forma.id)}
                  type="radio"
                  value={forma.id}
                />
                {/* Un dibujo de la forma y no una captura: se elige mirando, y
                    tres bloques bastan para ver la diferencia. */}
                <span aria-hidden="true" className={styles.muestraForma} data-forma={forma.id}>
                  <i />
                  <i />
                  <i />
                </span>
                <span className={styles.textoForma}>
                  <strong>{forma.nombre}</strong>
                  <span>{forma.descripcion}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.grupo} disabled={guardando}>
        <legend className={styles.leyendaOculta}>Elegí el fondo</legend>
        <PasoNumerado numero={3} titulo="Elegí el fondo" />
        <p className={styles.ayuda}>
          El catálogo lleva detrás un patrón de íconos tenue.
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
        {/* Con `PasoNumerado`, igual que el 1 y el 2. Estaba escrito a mano como
            «3. Revisá el resultado», que es exactamente lo que el comentario de ese
            componente dice que no hay que hacer: se lee como una lista y no como
            un paso. Quedó atrás cuando los otros dos se convirtieron. */}
        <header>
          <PasoNumerado
            descripcion="Así se verá la experiencia de tus clientes."
            idTitulo="titulo-demostracion"
            numero={4}
            titulo="Revisá el resultado"
          />
          <span>Vista completa de demostración</span>
        </header>
        {/* El marco lleva `.tema` y las dos marcas porque el patrón se pinta con
            `.tema[data-patron] > article`: sin el envoltorio, la vista previa
            mostraría todo menos el fondo, que es justo lo que se está eligiendo. */}
        <div
          className={`${temaStyles.tema} ${styles.marcoVista}`}
          data-paleta={paletaElegida}
          /* Misma regla que el catálogo: el de rubro es el de reserva, y con
             categorías propias el fondo lo dibuja la plantilla. */
          data-patron={
            patronElegido && iconosDePatron(datos.categorias).length === 0
              ? patronDeRubro(datos.negocio.rubro)
              : undefined
          }
          data-patron-opacidad={patronElegido ? opacidadElegida : undefined}
        >
          <PlantillaMipuesto datos={datosConForma} paleta={paletaElegida} />
        </div>
      </section>

      <div className={styles.barra}>
        <div className={styles.acciones}>
          <p className={hayCambioPendiente ? styles.avisoPendiente : styles.avisoCambio}>
            {hayCambioPendiente
              ? "Tenés cambios de apariencia sin guardar."
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
