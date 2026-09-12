"use client";

import { useEffect, useState } from "react";

import { DIAS, resumirFranjas, type Franja } from "../../lib/agenda/franjas";
import { Boton, useAvisos } from "../ui";
import styles from "./editor-de-agenda.module.css";

/* Cuándo atiende una categoría que vende tiempo.
 *
 * El dueño escribe tramos —«lunes de 8:30 a 12:00»— y **nunca una lista de
 * horarios**. Los horarios concretos los calcula el servidor con la duración del
 * turno: escribir «10:00, 10:30, 11:00…» a mano sería rehacerlo cada vez que
 * cambia el horario de atención, y es justo lo que el diseño de referencia traía
 * escrito a mano.
 */

type FranjaEnEdicion = { dia: string; desde: string; hasta: string };

type AgendaGuardada = {
  duracion_minutos: number;
  cupo_por_franja: number;
  anticipacion_minima_horas: number;
  dias_maximos: number;
  franjas: unknown;
};

/* Lo que se ofrece cuando la categoría todavía no tiene agenda. Media hora y un
   cupo es lo que hace una peluquería o un consultorio chico; el dueño corrige lo
   que no le sirve, que es más rápido que empezar de cero. */
const PREDETERMINADO = {
  duracionMinutos: "30",
  cupoPorFranja: "1",
  anticipacionMinimaHoras: "2",
  diasMaximos: "30",
};

export function EditorDeAgenda({ categoriaId }: { categoriaId: string }) {
  const [ajustes, setAjustes] = useState(PREDETERMINADO);
  const [franjas, setFranjas] = useState<FranjaEnEdicion[] | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const { mostrarAviso } = useAvisos();

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const respuesta = await fetch(`/api/catalogo/categorias/${categoriaId}/agenda`);
        const datos = (await respuesta.json()) as { agenda?: AgendaGuardada | null };
        if (!vigente) return;
        const agenda = datos.agenda;
        if (!agenda) {
          setFranjas([]);
          return;
        }
        setAjustes({
          duracionMinutos: String(agenda.duracion_minutos),
          cupoPorFranja: String(agenda.cupo_por_franja),
          anticipacionMinimaHoras: String(agenda.anticipacion_minima_horas),
          diasMaximos: String(agenda.dias_maximos),
        });
        setFranjas(
          (Array.isArray(agenda.franjas) ? (agenda.franjas as Franja[]) : []).map((franja) => ({
            dia: String(franja.dia),
            desde: franja.desde,
            hasta: franja.hasta,
          })),
        );
      } catch {
        if (vigente) setFranjas([]);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [categoriaId]);

  if (franjas === null) {
    return <p className={styles.cargando}>Cargando el horario…</p>;
  }

  function cambiarFranja(indice: number, cambio: Partial<FranjaEnEdicion>) {
    setFranjas((actuales) =>
      (actuales ?? []).map((franja, posicion) =>
        posicion === indice ? { ...franja, ...cambio } : franja,
      ),
    );
    setErrores({});
  }

  async function guardar() {
    setGuardando(true);
    setErrores({});
    try {
      const respuesta = await fetch(`/api/catalogo/categorias/${categoriaId}/agenda`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          duracionMinutos: Number(ajustes.duracionMinutos),
          cupoPorFranja: Number(ajustes.cupoPorFranja),
          anticipacionMinimaHoras: Number(ajustes.anticipacionMinimaHoras),
          diasMaximos: Number(ajustes.diasMaximos),
          franjas: (franjas ?? []).map((franja) => ({
            dia: Number(franja.dia),
            desde: franja.desde,
            hasta: franja.hasta,
          })),
        }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        errores?: Record<string, string>;
        agenda?: AgendaGuardada;
      };
      if (!respuesta.ok || !datos.agenda) {
        setErrores(datos.errores ?? {});
        throw new Error(datos.error || "No se pudo guardar el horario.");
      }
      mostrarAviso({ titulo: "Horario guardado", variante: "exito" });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo guardar el horario",
        mensaje: error instanceof Error ? error.message : "Intentá nuevamente.",
        variante: "error",
      });
    } finally {
      setGuardando(false);
    }
  }

  const semanaLeible = resumirFranjas(
    franjas
      .filter((franja) => franja.desde && franja.hasta)
      .map((franja) => ({ dia: Number(franja.dia), desde: franja.desde, hasta: franja.hasta })),
  );

  /* Cuántos turnos salen de lo cargado. Es la cuenta que el dueño hace de cabeza
     y se equivoca: con tramos de 3 horas y medias horas son seis, no cinco. */
  const turnosPorSemana = franjas.reduce((suma, franja) => {
    const duracion = Number(ajustes.duracionMinutos);
    if (!franja.desde || !franja.hasta || !duracion) return suma;
    const minutos =
      (Number(franja.hasta.slice(0, 2)) * 60 + Number(franja.hasta.slice(3))) -
      (Number(franja.desde.slice(0, 2)) * 60 + Number(franja.desde.slice(3)));
    return suma + Math.max(0, Math.floor(minutos / duracion));
  }, 0);

  return (
    <section className={styles.seccion}>
      <header className={styles.cabecera}>
        <h3>Cuándo atendés</h3>
        <p>
          Escribí los tramos en los que atendés. Los horarios que ve tu cliente salen de acá
          con la duración del turno: no hace falta escribirlos uno por uno.
        </p>
      </header>

      <div className={styles.ajustes}>
        <label className={styles.control}>
          <span>Cada turno dura</span>
          <div className={styles.conUnidad}>
            <input
              disabled={guardando}
              inputMode="numeric"
              onChange={(evento) =>
                setAjustes({ ...ajustes, duracionMinutos: evento.target.value })
              }
              type="text"
              value={ajustes.duracionMinutos}
            />
            <small>minutos</small>
          </div>
          {errores.duracionMinutos ? (
            <strong className={styles.error}>{errores.duracionMinutos}</strong>
          ) : null}
        </label>

        <label className={styles.control}>
          <span>A la vez atendés a</span>
          <div className={styles.conUnidad}>
            <input
              disabled={guardando}
              inputMode="numeric"
              onChange={(evento) => setAjustes({ ...ajustes, cupoPorFranja: evento.target.value })}
              type="text"
              value={ajustes.cupoPorFranja}
            />
            <small>persona(s)</small>
          </div>
          {/* El caso que explica para qué sirve: dos consultorios son dos cupos.
              Sin el ejemplo, «cupo» se lee como un número abstracto. */}
          <small className={styles.ayuda}>Dos consultorios, dos sillones: poné 2.</small>
          {errores.cupoPorFranja ? (
            <strong className={styles.error}>{errores.cupoPorFranja}</strong>
          ) : null}
        </label>

        <label className={styles.control}>
          <span>Pedir con</span>
          <div className={styles.conUnidad}>
            <input
              disabled={guardando}
              inputMode="numeric"
              onChange={(evento) =>
                setAjustes({ ...ajustes, anticipacionMinimaHoras: evento.target.value })
              }
              type="text"
              value={ajustes.anticipacionMinimaHoras}
            />
            <small>horas de anticipación</small>
          </div>
          <small className={styles.ayuda}>Para que nadie reserve para dentro de cinco minutos.</small>
          {errores.anticipacionMinimaHoras ? (
            <strong className={styles.error}>{errores.anticipacionMinimaHoras}</strong>
          ) : null}
        </label>

        <label className={styles.control}>
          <span>Se puede reservar hasta</span>
          <div className={styles.conUnidad}>
            <input
              disabled={guardando}
              inputMode="numeric"
              onChange={(evento) => setAjustes({ ...ajustes, diasMaximos: evento.target.value })}
              type="text"
              value={ajustes.diasMaximos}
            />
            <small>días adelante</small>
          </div>
          {errores.diasMaximos ? (
            <strong className={styles.error}>{errores.diasMaximos}</strong>
          ) : null}
        </label>
      </div>

      {franjas.length === 0 ? (
        <p className={styles.vacio}>
          Todavía no cargaste ningún tramo, así que tu cliente no ve horarios para elegir.
        </p>
      ) : null}

      {franjas.map((franja, indice) => (
        <div className={styles.franja} key={indice}>
          <label className={styles.control}>
            <span>Día</span>
            <select
              disabled={guardando}
              onChange={(evento) => cambiarFranja(indice, { dia: evento.target.value })}
              value={franja.dia}
            >
              {DIAS.map((dia) => (
                <option key={dia.id} value={dia.id}>
                  {dia.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.control}>
            <span>Desde</span>
            <input
              disabled={guardando}
              onChange={(evento) => cambiarFranja(indice, { desde: evento.target.value })}
              type="time"
              value={franja.desde}
            />
          </label>

          <label className={styles.control}>
            <span>Hasta</span>
            <input
              disabled={guardando}
              onChange={(evento) => cambiarFranja(indice, { hasta: evento.target.value })}
              type="time"
              value={franja.hasta}
            />
          </label>

          <button
            className={styles.quitar}
            disabled={guardando}
            onClick={() =>
              setFranjas((actuales) => (actuales ?? []).filter((_, p) => p !== indice))
            }
            type="button"
          >
            Quitar
          </button>

          {errores[`franjas.${indice}.desde`] ? (
            <strong className={styles.error}>{errores[`franjas.${indice}.desde`]}</strong>
          ) : null}
          {errores[`franjas.${indice}.hasta`] ? (
            <strong className={styles.error}>{errores[`franjas.${indice}.hasta`]}</strong>
          ) : null}
          {errores[`franjas.${indice}.dia`] ? (
            <strong className={styles.error}>{errores[`franjas.${indice}.dia`]}</strong>
          ) : null}
        </div>
      ))}

      {errores.franjas ? <strong className={styles.error}>{errores.franjas}</strong> : null}

      {/* El resumen de lo cargado, en una línea, y cuántos turnos salen. Es lo que
          el dueño mira para confirmar que puso lo que quería sin tener que leer
          la tabla de arriba. */}
      {franjas.length > 0 ? (
        <p className={styles.resumen}>
          {semanaLeible}
          <span> · {turnosPorSemana} turnos por semana</span>
        </p>
      ) : null}

      <div className={styles.pie}>
        <Boton
          disabled={guardando}
          onClick={() =>
            setFranjas([...franjas, { dia: "1", desde: "09:00", hasta: "12:00" }])
          }
          type="button"
          variante="secundario"
        >
          Agregar un tramo
        </Boton>
        <Boton cargando={guardando} onClick={() => void guardar()} type="button">
          Guardar el horario
        </Boton>
      </div>
    </section>
  );
}
