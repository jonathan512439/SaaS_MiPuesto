"use client";

import { useRef, useState, type FormEvent } from "react";

import { construirEnlaceContacto } from "../../lib/contacto";
import {
  armarMensajeEmpezar,
  LARGO_MAXIMO_NOMBRE_NEGOCIO,
  validarEmpezar,
  type ErroresEmpezar,
  type OpcionDemostracion,
  type OpcionTarjeta,
} from "../../lib/empezar";
import {
  TARJETA_ACRILICO,
  TARJETA_ACRILICO_GRANDE,
  opcionAlta,
  type OpcionAlta,
} from "../../lib/planes";
import { Formulario } from "../ui/formulario";
import styles from "./barra-empezar.module.css";

type Propiedades = {
  opcion: OpcionAlta;
  rubros: { grupo: string; rubros: { id: string; nombre: string }[] }[];
  ciudades: { id: string; nombre: string }[];
};

/* El botón de la opción elegida, fijo al pie de la pantalla, y el formulario
 * corto que abre.
 *
 * El formulario no manda nada a ningún servidor: arma el mensaje y abre
 * WhatsApp con él escrito (`lib/empezar.ts`). Los tres datos que pide son los
 * que siempre había que preguntar antes de habilitar una prueba; la tarjeta y
 * la demostración son opcionales y van en el mismo mensaje. */
export function BarraEmpezar({ opcion, rubros, ciudades }: Propiedades) {
  const elegida = opcionAlta(opcion);
  const dialogo = useRef<HTMLDialogElement>(null);
  const [negocio, setNegocio] = useState("");
  const [rubro, setRubro] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [tarjeta, setTarjeta] = useState<OpcionTarjeta>("ninguna");
  const [demostracion, setDemostracion] = useState<OpcionDemostracion>("no");
  const [errores, setErrores] = useState<ErroresEmpezar>({});

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = { opcion: elegida.id, negocio, rubro, ciudad, tarjeta, demostracion };
    const encontrados = validarEmpezar(datos);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    window.open(construirEnlaceContacto(armarMensajeEmpezar(datos)), "_blank", "noopener");
    dialogo.current?.close();
  }

  return (
    <>
      <div className={styles.barra}>
        <div className={styles.barraContenido}>
          <p className={styles.eleccion}>
            <strong>{elegida.nombre}</strong>
            <span>{elegida.precio}</span>
          </p>
          <button className={styles.boton} onClick={() => dialogo.current?.showModal()} type="button">
            {elegida.llamada}
          </button>
        </div>
      </div>

      <dialog aria-labelledby="titulo-empezar" className={styles.dialogo} ref={dialogo}>
        <Formulario className={styles.formulario} noValidate onSubmit={enviar}>
          <div className={styles.cabecera}>
            <h2 id="titulo-empezar">{elegida.llamada}</h2>
            <button
              aria-label="Cerrar"
              className={styles.cerrar}
              onClick={() => dialogo.current?.close()}
              type="button"
            >
              ×
            </button>
          </div>
          <p className={styles.ayuda}>
            Tres datos y se abre WhatsApp con tu mensaje listo para enviar. Habilitamos tu cuenta el
            mismo día.
          </p>

          <label className={styles.campo}>
            <span>Nombre de tu negocio</span>
            <input
              aria-invalid={errores.negocio ? true : undefined}
              autoComplete="organization"
              maxLength={LARGO_MAXIMO_NOMBRE_NEGOCIO}
              onChange={(evento) => setNegocio(evento.target.value)}
              value={negocio}
            />
            {errores.negocio ? <small className={styles.error}>{errores.negocio}</small> : null}
          </label>

          <label className={styles.campo}>
            <span>¿Qué vendes?</span>
            <select
              aria-invalid={errores.rubro ? true : undefined}
              onChange={(evento) => setRubro(evento.target.value)}
              value={rubro}
            >
              <option value="">Elige tu rubro</option>
              {rubros.map(({ grupo, rubros: lista }) => (
                <optgroup key={grupo} label={grupo}>
                  {lista.map(({ id, nombre }) => (
                    <option key={id} value={id}>
                      {nombre}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errores.rubro ? <small className={styles.error}>{errores.rubro}</small> : null}
          </label>

          <label className={styles.campo}>
            <span>Tu ciudad</span>
            <select
              aria-invalid={errores.ciudad ? true : undefined}
              onChange={(evento) => setCiudad(evento.target.value)}
              value={ciudad}
            >
              <option value="">Elige tu ciudad</option>
              {ciudades.map(({ id, nombre }) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
            {errores.ciudad ? <small className={styles.error}>{errores.ciudad}</small> : null}
          </label>

          <fieldset className={styles.grupo}>
            <legend>¿Quieres también una tarjeta de acrílico?</legend>
            {(
              [
                ["ninguna", "Por ahora no"],
                ["mesa", `${TARJETA_ACRILICO.nombre}, Bs ${TARJETA_ACRILICO.precioBs}`],
                ["grande", `${TARJETA_ACRILICO_GRANDE.nombre}, Bs ${TARJETA_ACRILICO_GRANDE.precioBs}`],
              ] as const
            ).map(([valor, texto]) => (
              <label key={valor}>
                <input
                  checked={tarjeta === valor}
                  name="tarjeta"
                  onChange={() => setTarjeta(valor)}
                  type="radio"
                />
                {texto}
              </label>
            ))}
          </fieldset>

          <fieldset className={styles.grupo}>
            <legend>¿Quieres verlo antes con nosotros?</legend>
            {(
              [
                ["no", "No hace falta"],
                ["presencial", "Sí, en persona"],
                ["videollamada", "Sí, por videollamada"],
              ] as const
            ).map(([valor, texto]) => (
              <label key={valor}>
                <input
                  checked={demostracion === valor}
                  name="demostracion"
                  onChange={() => setDemostracion(valor)}
                  type="radio"
                />
                {texto}
              </label>
            ))}
          </fieldset>

          <button className={styles.boton} type="submit">
            Escribir por WhatsApp
          </button>
        </Formulario>
      </dialog>
    </>
  );
}
