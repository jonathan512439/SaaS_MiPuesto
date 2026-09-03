"use client";

import { useState, type FormEvent } from "react";

import {
  DIAS_SEMANA,
  validarHorario,
  type DiaSemana,
  type HorarioNormalizado,
  type IntervaloHorario,
  type ModoHorario,
} from "../../lib/horario";
import { validarOperacionNegocio } from "../../lib/negocios/operacion";
import { Boton, Campo, Selector } from "../ui";
import styles from "./formulario-operacion.module.css";

export type OperacionNegocioInicial = {
  horario: unknown;
  reserva_minutos: number;
};

type PropiedadesFormularioOperacion = {
  operacionInicial: OperacionNegocioInicial;
};

const NOMBRES_DIAS: Record<DiaSemana, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

function horarioInicial(valor: unknown): HorarioNormalizado {
  const validacion = validarHorario(valor);
  if (validacion.correcto) return validacion.horario;
  const horarioVacio = validarHorario({});
  if (horarioVacio.correcto) return horarioVacio.horario;
  throw new Error("No se pudo preparar el horario inicial.");
}

export function FormularioOperacion({ operacionInicial }: PropiedadesFormularioOperacion) {
  const [horario, setHorario] = useState(() => horarioInicial(operacionInicial.horario));
  const [reservaMinutos, setReservaMinutos] = useState(
    String(operacionInicial.reserva_minutos),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");
  const [mensajeEsError, setMensajeEsError] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function cambiarModo(modo: ModoHorario) {
    setHorario((actual) => ({ ...actual, modo }));
    setMensaje("");
    setMensajeEsError(false);
  }

  function cambiarDia(dia: DiaSemana, abierto: boolean) {
    setHorario((actual) => ({
      ...actual,
      dias: {
        ...actual.dias,
        [dia]: abierto ? [{ abre: "08:00", cierra: "18:00" }] : [],
      },
    }));
  }

  function cambiarIntervalo(
    dia: DiaSemana,
    indice: number,
    campo: keyof IntervaloHorario,
    valor: string,
  ) {
    setHorario((actual) => ({
      ...actual,
      dias: {
        ...actual.dias,
        [dia]: actual.dias[dia].map((intervalo, posicion) =>
          posicion === indice ? { ...intervalo, [campo]: valor } : intervalo,
        ),
      },
    }));
  }

  function agregarIntervalo(dia: DiaSemana) {
    setHorario((actual) => ({
      ...actual,
      dias: {
        ...actual.dias,
        [dia]: [...actual.dias[dia], { abre: "14:00", cierra: "18:00" }],
      },
    }));
  }

  function quitarIntervalo(dia: DiaSemana, indice: number) {
    setHorario((actual) => ({
      ...actual,
      dias: {
        ...actual.dias,
        [dia]: actual.dias[dia].filter((_, posicion) => posicion !== indice),
      },
    }));
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje("");
    setMensajeEsError(false);
    const validacion = validarOperacionNegocio({
      horario,
      reserva_minutos: reservaMinutos,
    });
    if (!validacion.correcto) {
      setErrores(validacion.errores);
      return;
    }

    setErrores({});
    setGuardando(true);
    try {
      const respuesta = await fetch("/api/negocios/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validacion.datos),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        errores?: Record<string, string>;
        negocio?: OperacionNegocioInicial;
      };
      if (!respuesta.ok || !datos.negocio) {
        setErrores(datos.errores ?? {});
        throw new Error(datos.error || "No se pudo guardar la atención del negocio.");
      }
      setHorario(horarioInicial(datos.negocio.horario));
      setReservaMinutos(String(datos.negocio.reserva_minutos));
      setMensaje("Horario y tiempo de reserva guardados.");
      setMensajeEsError(false);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudieron guardar los cambios.");
      setMensajeEsError(true);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className={styles.formulario} onSubmit={guardar}>
      <header className={styles.cabecera}>
        <div>
          <p>Atención y reservas</p>
          <h2>Define cuándo pueden hacer pedidos</h2>
        </div>
        <p>
          Fuera del horario programado tus clientes podrán navegar, pero no confirmar pedidos.
        </p>
      </header>

      <div className={styles.controles}>
        <Selector
          ayuda="Puedes cambiarlo después sin perder productos ni pedidos."
          error={errores.horario}
          etiqueta="Horario del negocio"
          id="modo-horario"
          onChange={(evento) => cambiarModo(evento.target.value as ModoHorario)}
          value={horario.modo}
        >
          <option value="sin_horario">Sin horario publicado</option>
          <option value="siempre_abierto">Siempre abierto</option>
          <option value="programado">Horario programado</option>
        </Selector>
        <Campo
          ayuda="Ese tiempo comienza cuando el cliente confirma la reserva."
          error={errores.reserva_minutos}
          etiqueta="Minutos que se guarda una reserva"
          id="reserva-minutos"
          inputMode="numeric"
          max="1440"
          min="5"
          onChange={(evento) => setReservaMinutos(evento.target.value)}
          required
          step="5"
          type="number"
          value={reservaMinutos}
        />
      </div>

      {horario.modo === "programado" ? (
        <fieldset className={styles.semana}>
          <legend>Semana de atención</legend>
          <div className={styles.listaDias}>
          {DIAS_SEMANA.map((dia) => {
            const intervalos = horario.dias[dia];
            return (
              <div className={styles.dia} data-abierto={intervalos.length ? "si" : undefined} key={dia}>
                <label className={styles.activarDia}>
                  <input
                    checked={intervalos.length > 0}
                    onChange={(evento) => cambiarDia(dia, evento.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    <strong>{NOMBRES_DIAS[dia]}</strong>
                    <small>{intervalos.length ? "Atiende" : "Cerrado"}</small>
                  </span>
                </label>
                {intervalos.length ? (
                  <div className={styles.intervalos}>
                    {intervalos.map((intervalo, indice) => (
                      <div className={styles.intervalo} key={`${dia}-${indice}`}>
                        <label>
                          Abre
                          <input
                            aria-label={`${NOMBRES_DIAS[dia]}, hora de apertura ${indice + 1}`}
                            onChange={(evento) =>
                              cambiarIntervalo(dia, indice, "abre", evento.target.value)
                            }
                            type="time"
                            value={intervalo.abre}
                          />
                        </label>
                        <label>
                          Cierra
                          <input
                            aria-label={`${NOMBRES_DIAS[dia]}, hora de cierre ${indice + 1}`}
                            onChange={(evento) =>
                              cambiarIntervalo(dia, indice, "cierra", evento.target.value)
                            }
                            type="time"
                            value={intervalo.cierra}
                          />
                        </label>
                        {intervalos.length > 1 ? (
                          <button
                            aria-label={`Quitar horario ${indice + 1} de ${NOMBRES_DIAS[dia]}`}
                            onClick={() => quitarIntervalo(dia, indice)}
                            type="button"
                          >
                            Quitar
                          </button>
                        ) : null}
                      </div>
                    ))}
                    {intervalos.length < 3 ? (
                      <button onClick={() => agregarIntervalo(dia)} type="button">
                        Agregar otro horario
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
          </div>
        </fieldset>
      ) : (
        <p className={styles.explicacionModo}>
          {horario.modo === "siempre_abierto"
            ? "Los pedidos estarán disponibles todos los días y a cualquier hora."
            : "No mostraremos un horario y las acciones permanecerán disponibles."}
        </p>
      )}

      {mensaje ? (
        <p
          className={mensajeEsError ? styles.error : styles.exito}
          role={mensajeEsError ? "alert" : "status"}
        >
          {mensaje}
        </p>
      ) : null}

      <div className={styles.acciones}>
        <Boton cargando={guardando} type="submit">Guardar atención y reservas</Boton>
      </div>
    </form>
  );
}
