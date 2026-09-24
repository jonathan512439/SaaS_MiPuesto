"use client";

import { useState, type FormEvent } from "react";

import {
  DIAS_SEMANA,
  fechaHoyEnLaPaz,
  MAXIMO_EXCEPCIONES,
  MAXIMO_MOTIVO,
  validarHorario,
  type DiaSemana,
  type ExcepcionHorario,
  type HorarioNormalizado,
  type IntervaloHorario,
  type ModoHorario,
} from "../../lib/horario";
import { validarOperacionNegocio } from "../../lib/negocios/operacion";
import { TOPE_UNIDADES_MAXIMO } from "../../lib/pedidos/tope-unidades";
import { Boton, Campo, Selector, useAvisos } from "../ui";
import styles from "./formulario-operacion.module.css";

export type OperacionNegocioInicial = {
  horario: unknown;
  reserva_minutos: number;
  tope_unidades_pedido: number | null;
};

type PropiedadesFormularioOperacion = {
  operacionInicial: OperacionNegocioInicial;
  /* El tope de unidades solo tiene sentido con carrito: en un catálogo que
     agenda turnos o solo muestra, el control se oculta y el dato queda. */
  conCarrito: boolean;
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
  const base = validacion.correcto ? validacion.horario : null;
  if (base) return { ...base, excepciones: soloVigentes(base.excepciones) };

  const horarioVacio = validarHorario({});
  if (horarioVacio.correcto) return horarioVacio.horario;
  throw new Error("No se pudo preparar el horario inicial.");
}

/* Las fechas que ya pasaron no se muestran, y como el formulario guarda lo que
   muestra, guardar limpia la lista sola. Un feriado del año pasado no informa
   nada y solo gasta uno de los cupos. */
function soloVigentes(excepciones: ExcepcionHorario[]) {
  const hoy = fechaHoyEnLaPaz();
  return excepciones.filter((excepcion) => excepcion.fecha >= hoy);
}

function formatearFechaLegible(fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return "";
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${fecha}T00:00:00Z`));
}

function textoTope(valor: number | null | undefined) {
  return typeof valor === "number" ? String(valor) : "";
}

export function FormularioOperacion({
  operacionInicial,
  conCarrito,
}: PropiedadesFormularioOperacion) {
  const [horario, setHorario] = useState(() => horarioInicial(operacionInicial.horario));
  const [reservaMinutos, setReservaMinutos] = useState(
    String(operacionInicial.reserva_minutos),
  );
  const [topeUnidades, setTopeUnidades] = useState(() =>
    textoTope(operacionInicial.tope_unidades_pedido),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const { mostrarAviso } = useAvisos();
  const [guardando, setGuardando] = useState(false);

  function cambiarModo(modo: ModoHorario) {
    setHorario((actual) => ({ ...actual, modo }));
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

  function cambiarExcepcion(indice: number, cambios: Partial<ExcepcionHorario>) {
    setHorario((actual) => ({
      ...actual,
      excepciones: actual.excepciones.map((excepcion, posicion) =>
        posicion === indice ? { ...excepcion, ...cambios } : excepcion,
      ),
    }));
  }

  function agregarExcepcion() {
    setHorario((actual) => ({
      ...actual,
      excepciones: [
        ...actual.excepciones,
        {
          fecha: fechaHoyEnLaPaz(),
          cerrado: true,
          intervalos: [{ abre: "09:00", cierra: "13:00" }],
          motivo: "",
        },
      ],
    }));
  }

  function quitarExcepcion(indice: number) {
    setHorario((actual) => ({
      ...actual,
      excepciones: actual.excepciones.filter((_, posicion) => posicion !== indice),
    }));
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const validacion = validarOperacionNegocio({
      horario,
      reserva_minutos: reservaMinutos,
      tope_unidades_pedido: topeUnidades,
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
      setTopeUnidades(textoTope(datos.negocio.tope_unidades_pedido));
      mostrarAviso({ titulo: "Atención guardada", variante: "exito" });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo guardar la atención",
        mensaje: error instanceof Error ? error.message : "Intenta nuevamente.",
        variante: "error",
      });
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
          ayuda="Puedes cambiarlo cuando quieras."
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
        {conCarrito ? (
          <Campo
            ayuda="Cuenta todas las unidades del pedido. Déjalo vacío para no poner tope."
            error={errores.tope_unidades_pedido}
            etiqueta="Máximo de unidades por pedido"
            id="tope-unidades"
            inputMode="numeric"
            max={String(TOPE_UNIDADES_MAXIMO)}
            min="1"
            onChange={(evento) => setTopeUnidades(evento.target.value)}
            placeholder="Sin tope"
            step="1"
            type="number"
            value={topeUnidades}
          />
        ) : null}
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

      {horario.modo === "sin_horario" ? null : (
        <fieldset className={styles.excepciones}>
          <legend>Fechas especiales</legend>
          <p className={styles.ayudaExcepciones}>
            Feriados, días especiales o imprevistos: mandan sobre el horario de ese día.
            {/* Se conserva esta frase aunque el resto se acorto: es lo unico del
                bloque que describe algo que pasa solo. Sin ella, el dueno vuelve
                en marzo, no encuentra el feriado de enero que cargo, y cree que
                se perdio. */}{" "}
            Las que ya pasaron se borran al guardar.
          </p>

          {horario.excepciones.length === 0 ? (
            <p className={styles.sinExcepciones}>Todavía no cargaste ninguna.</p>
          ) : (
            <ul className={styles.listaExcepciones}>
              {horario.excepciones.map((excepcion, indice) => (
                <li className={styles.excepcion} key={`excepcion-${indice}`}>
                  <div className={styles.filaExcepcion}>
                    <label>
                      Fecha
                      <input
                        min={fechaHoyEnLaPaz()}
                        onChange={(evento) =>
                          cambiarExcepcion(indice, { fecha: evento.target.value })
                        }
                        type="date"
                        value={excepcion.fecha}
                      />
                    </label>
                    <label>
                      Motivo
                      <input
                        maxLength={MAXIMO_MOTIVO}
                        onChange={(evento) =>
                          cambiarExcepcion(indice, { motivo: evento.target.value })
                        }
                        placeholder="Día de la Patria"
                        type="text"
                        value={excepcion.motivo}
                      />
                    </label>
                    <button
                      aria-label={`Quitar la fecha especial ${excepcion.fecha}`}
                      onClick={() => quitarExcepcion(indice)}
                      type="button"
                    >
                      Quitar
                    </button>
                  </div>

                  <div className={styles.filaExcepcion}>
                    <label className={styles.opcionCerrado}>
                      <input
                        checked={excepcion.cerrado}
                        onChange={(evento) =>
                          cambiarExcepcion(indice, { cerrado: evento.target.checked })
                        }
                        type="checkbox"
                      />
                      <span>Cerrado todo el día</span>
                    </label>
                    {excepcion.cerrado ? null : (
                      <>
                        <label>
                          Abre
                          <input
                            aria-label={`Hora de apertura del ${excepcion.fecha}`}
                            onChange={(evento) =>
                              cambiarExcepcion(indice, {
                                intervalos: [
                                  {
                                    abre: evento.target.value,
                                    cierra: excepcion.intervalos[0]?.cierra ?? "13:00",
                                  },
                                ],
                              })
                            }
                            type="time"
                            value={excepcion.intervalos[0]?.abre ?? "09:00"}
                          />
                        </label>
                        <label>
                          Cierra
                          <input
                            aria-label={`Hora de cierre del ${excepcion.fecha}`}
                            onChange={(evento) =>
                              cambiarExcepcion(indice, {
                                intervalos: [
                                  {
                                    abre: excepcion.intervalos[0]?.abre ?? "09:00",
                                    cierra: evento.target.value,
                                  },
                                ],
                              })
                            }
                            type="time"
                            value={excepcion.intervalos[0]?.cierra ?? "13:00"}
                          />
                        </label>
                      </>
                    )}
                  </div>

                  <p className={styles.resumenExcepcion}>
                    {formatearFechaLegible(excepcion.fecha) || "Elige una fecha"}
                    {excepcion.cerrado
                      ? ": cerrado"
                      : `: ${excepcion.intervalos[0]?.abre ?? "09:00"} a ${
                          excepcion.intervalos[0]?.cierra ?? "13:00"
                        }`}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {horario.excepciones.length < MAXIMO_EXCEPCIONES ? (
            <button className={styles.agregarExcepcion} onClick={agregarExcepcion} type="button">
              Agregar una fecha especial
            </button>
          ) : (
            <p className={styles.sinExcepciones}>
              Llegaste al máximo de {MAXIMO_EXCEPCIONES} fechas.
            </p>
          )}
        </fieldset>
      )}

      <div className={styles.acciones}>
        <Boton cargando={guardando} type="submit">Guardar atención y reservas</Boton>
      </div>
    </form>
  );
}
