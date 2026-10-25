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
import { Boton, Campo, Selector, SelectorDeFecha, SelectorDeHora, useAvisos, Formulario } from "../ui";
import styles from "./formulario-operacion.module.css";

export type OperacionNegocioInicial = {
  horario: unknown;
  reserva_minutos: number;
  tope_unidades_pedido: number | null;
  pide_nota_pedido?: boolean | null;
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
  const [pideNota, setPideNota] = useState(operacionInicial.pide_nota_pedido === true);
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
      pide_nota_pedido: pideNota,
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
      setPideNota(datos.negocio.pide_nota_pedido === true);
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
    <Formulario className={styles.formulario} onSubmit={guardar}>
      <header className={styles.cabecera}>
        <div>
          <p>Atención y reservas</p>
          <h2>Define cuándo pueden hacer pedidos</h2>
        </div>
        <p>
          Fuera de este horario tus clientes pueden ver tu catálogo, pero no enviarte pedidos.
        </p>
      </header>

      <div className={styles.controles}>
        <Selector
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
          ayuda="Lo pedido queda apartado mientras te escribe. Si no confirmas, se libera."
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
            ayuda="Sumando todos los productos. Vacío, sin límite."
            error={errores.tope_unidades_pedido}
            etiqueta="Máximo de unidades por pedido"
            id="tope-unidades"
            inputMode="numeric"
            max={String(TOPE_UNIDADES_MAXIMO)}
            min="1"
            onChange={(evento) => setTopeUnidades(evento.target.value)}
            placeholder="Sin límite"
            step="1"
            type="number"
            value={topeUnidades}
          />
        ) : null}
        {/* Solo con carrito, como el tope: es el único lugar donde el cliente
            confirma un pedido. Apagado, el dato queda; el carrito deja de
            preguntar. */}
        {conCarrito ? (
          <label className={styles.interruptor}>
            <input
              checked={pideNota}
              onChange={(evento) => setPideNota(evento.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>Notas del pedido</strong>
              <small>Tu cliente puede escribir una aclaración al pedir.</small>
            </span>
          </label>
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
                        <SelectorDeHora
                          alCambiar={(hora) => cambiarIntervalo(dia, indice, "abre", hora)}
                          descripcion={`${NOMBRES_DIAS[dia]}, hora de apertura ${indice + 1}`}
                          etiqueta="Abre"
                          id={`horario-${dia}-${indice}-abre`}
                          paso={30}
                          valor={intervalo.abre}
                        />
                        <SelectorDeHora
                          alCambiar={(hora) => cambiarIntervalo(dia, indice, "cierra", hora)}
                          descripcion={`${NOMBRES_DIAS[dia]}, hora de cierre ${indice + 1}`}
                          etiqueta="Cierra"
                          id={`horario-${dia}-${indice}-cierra`}
                          paso={30}
                          valor={intervalo.cierra}
                        />
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
            : "Sin horario: siempre se puede pedir."}
        </p>
      )}

      {horario.modo === "sin_horario" ? null : (
        <fieldset className={styles.excepciones}>
          <legend>Fechas especiales</legend>
          <p className={styles.ayudaExcepciones}>
            Feriados, días especiales o imprevistos: ese día vale este horario y no el de siempre.
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
                    <SelectorDeFecha
                      alCambiar={(fecha) => cambiarExcepcion(indice, { fecha })}
                      etiqueta="Fecha"
                      hoy={fechaHoyEnLaPaz()}
                      id={`excepcion-${indice}-fecha`}
                      minimo={fechaHoyEnLaPaz()}
                      valor={excepcion.fecha}
                    />
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
                        <SelectorDeHora
                          alCambiar={(hora) =>
                            cambiarExcepcion(indice, {
                              intervalos: [{ abre: hora, cierra: excepcion.intervalos[0]?.cierra ?? "13:00" }],
                            })
                          }
                          descripcion={`Hora de apertura del ${excepcion.fecha}`}
                          etiqueta="Abre"
                          id={`excepcion-${indice}-abre`}
                          paso={30}
                          valor={excepcion.intervalos[0]?.abre ?? "09:00"}
                        />
                        <SelectorDeHora
                          alCambiar={(hora) =>
                            cambiarExcepcion(indice, {
                              intervalos: [{ abre: excepcion.intervalos[0]?.abre ?? "09:00", cierra: hora }],
                            })
                          }
                          descripcion={`Hora de cierre del ${excepcion.fecha}`}
                          etiqueta="Cierra"
                          id={`excepcion-${indice}-cierra`}
                          paso={30}
                          valor={excepcion.intervalos[0]?.cierra ?? "13:00"}
                        />
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
    </Formulario>
  );
}
