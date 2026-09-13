"use client";

import { useMemo, useState } from "react";

import { describirCita } from "../../lib/agenda/horarios";
import { resumirFranjas, leerFranjas } from "../../lib/agenda/franjas";
import { EditorDeAgenda } from "../catalogo/editor-de-agenda";
import { Boton, Campo, Selector, useAvisos, useConfirmacion } from "../ui";
import styles from "./gestor-agenda.module.css";

/* La agenda del negocio, entera y en un solo lugar.
 *
 * Tres cosas que el dueño hace acá y en ningún otro lado:
 *
 *   - Decir **quién atiende** —el doctor, el peluquero, el consultorio— y cuándo.
 *   - **Apagar las reservas** de alguien con un gesto, el día que se enferma.
 *   - Ver el cronograma y **cargar a mano** lo que llegó por teléfono, o
 *     bloquear una hora con una nota que le recuerde por qué.
 *
 * Lo que llega del catálogo entra como «sin confirmar» y el dueño decide: lo
 * confirma si le parece serio, o lo cancela y la hora vuelve a ofrecerse. Nada
 * queda aceptado sin que él lo haya visto.
 */

export type RecursoAdmin = {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
  acepta_reservas: boolean;
  franjas: unknown;
  duracion_minutos: number | null;
};

export type CitaAgenda = {
  id: string;
  codigo: string;
  recurso_id: string;
  inicio: string;
  fin: string;
  producto: string | null;
  nombre_cliente: string;
  telefono_cliente: string | null;
  nota: string | null;
  nota_interna: string | null;
  estado: string;
  origen: string;
};

export type ServicioAgendable = { id: string; nombre: string; recurso_id: string | null };

const ROTULOS: Record<string, string> = {
  pendiente: "Sin confirmar",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  cumplida: "Cumplida",
};

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HORAS_DETRAS_DE_UTC = 4;

/* La fecha del negocio de un instante. Bolivia no cambia de hora, así que el
   desfase es fijo; se escribe explícito porque el navegador del dueño podría
   estar en otra zona y `toLocaleDateString` le mostraría el día equivocado. */
function fechaDe(iso: string): string {
  return new Date(new Date(iso).getTime() - HORAS_DETRAS_DE_UTC * 3600_000).toISOString().slice(0, 10);
}

function rotuloDia(fecha: string): string {
  const [, mes, dia] = fecha.split("-");
  const semana = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return `${DIAS_CORTOS[semana]} ${Number(dia)}/${Number(mes)}`;
}

function horaDe(iso: string): string {
  const local = new Date(new Date(iso).getTime() - HORAS_DETRAS_DE_UTC * 3600_000);
  return local.toISOString().slice(11, 16);
}

/* Del día y la hora que escribe el dueño al instante real. Las 10:00 de Bolivia
   son las 14:00 UTC. */
function instanteDe(fecha: string, hora: string): string {
  return new Date(
    new Date(`${fecha}T${hora}:00Z`).getTime() + HORAS_DETRAS_DE_UTC * 3600_000,
  ).toISOString();
}

function hoyEnBolivia(): string {
  return fechaDe(new Date().toISOString());
}

export function GestorAgenda({
  recursosIniciales,
  citasIniciales,
  servicios,
}: {
  recursosIniciales: RecursoAdmin[];
  citasIniciales: CitaAgenda[];
  servicios: ServicioAgendable[];
}) {
  const [recursos, setRecursos] = useState(recursosIniciales);
  const [citas, setCitas] = useState(citasIniciales);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [recursoAbierto, setRecursoAbierto] = useState<string | null>(null);
  /* Abre en hoy si hoy tiene turnos; si no, en el primer día que los tenga. La
     primera versión abría siempre en hoy, y el dueño con todos sus pedidos para
     mañana veía «Nada agendado» y concluía que los botones de confirmar no
     existían. Estaban en un día que no estaba mirando. */
  const [diaElegido, setDiaElegido] = useState(() => {
    const hoy = hoyEnBolivia();
    const conTurnos = citasIniciales
      .filter((cita) => cita.estado !== "cancelada" && fechaDe(cita.inicio) >= hoy)
      .map((cita) => fechaDe(cita.inicio))
      .sort();
    return conTurnos.includes(hoy) ? hoy : (conTurnos[0] ?? hoy);
  });
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [formulario, setFormulario] = useState<{
    abierto: boolean;
    recursoId: string;
    productoId: string;
    fecha: string;
    hora: string;
    duracion: string;
    nombre: string;
    telefono: string;
    notaInterna: string;
  } | null>(null);
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();

  /* Los próximos catorce días, con cuántos turnos tiene cada uno. El número al
     lado del día es lo que le dice al dueño dónde mirar sin abrir uno por uno. */
  const dias = useMemo(() => {
    const hoy = hoyEnBolivia();
    return Array.from({ length: 14 }, (_, salto) => {
      const fecha = new Date(`${hoy}T00:00:00Z`);
      fecha.setUTCDate(fecha.getUTCDate() + salto);
      const clave = fecha.toISOString().slice(0, 10);
      const cantidad = citas.filter(
        (cita) => cita.estado !== "cancelada" && fechaDe(cita.inicio) === clave,
      ).length;
      return { fecha: clave, cantidad };
    });
  }, [citas]);

  /* La lista del día **no incluye las pendientes**: esas viven en el buzón de
     arriba, que abarca todos los días. Mostrarlas también acá era la
     duplicación. Abajo queda la agenda ya resuelta —confirmadas, cumplidas,
     canceladas— del día elegido. */
  const citasDelDia = citas
    .filter((cita) => fechaDe(cita.inicio) === diaElegido && cita.estado !== "pendiente")
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  const pendientes = citas
    .filter((cita) => cita.estado === "pendiente")
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  /* Cuántas pendientes caen en el día elegido: sirve para que la lista de abajo,
     cuando quede vacía, mande a mirar el buzón en vez de decir «no hay nada». */
  const pendientesDelDia = pendientes.filter(
    (cita) => fechaDe(cita.inicio) === diaElegido,
  ).length;

  function informarError(titulo: string, error: unknown) {
    mostrarAviso({
      titulo,
      mensaje: error instanceof Error ? error.message : "Intentá nuevamente.",
      variante: "error",
    });
  }

  async function crearRecurso() {
    if (nuevoNombre.trim() === "") return;
    setCargando(true);
    try {
      const respuesta = await fetch("/api/catalogo/recursos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre: nuevoNombre }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        recurso?: Omit<RecursoAdmin, "franjas" | "duracion_minutos">;
      };
      if (!respuesta.ok || !datos.recurso) throw new Error(datos.error || "No se pudo crear.");
      setRecursos((actuales) => [
        ...actuales,
        { ...datos.recurso!, franjas: [], duracion_minutos: null },
      ]);
      setNuevoNombre("");
      setRecursoAbierto(datos.recurso.id);
    } catch (error) {
      informarError("No se pudo crear el recurso", error);
    } finally {
      setCargando(false);
    }
  }

  async function cambiarRecurso(id: string, cambio: { acepta_reservas?: boolean; activo?: boolean }) {
    setOcupado(id);
    try {
      const respuesta = await fetch("/api/catalogo/recursos", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...cambio }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo actualizar.");
      setRecursos((actuales) =>
        actuales.map((recurso) => (recurso.id === id ? { ...recurso, ...cambio } : recurso)),
      );
    } catch (error) {
      informarError("No se pudo actualizar el recurso", error);
    } finally {
      setOcupado(null);
    }
  }

  async function cambiarEstado(cita: CitaAgenda, estado: string) {
    if (estado === "cancelada") {
      const seguro = await confirmar({
        titulo: `Cancelar el turno de ${cita.nombre_cliente}`,
        descripcion: `${describirCita(cita.inicio)}. La hora vuelve a quedar libre en el catálogo.`,
        textoAccion: "Cancelar el turno",
        destructiva: true,
      });
      if (!seguro) return;
    }
    setOcupado(cita.id);
    try {
      const respuesta = await fetch("/api/catalogo/citas", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: cita.id, estado }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo actualizar.");
      setCitas((actuales) =>
        actuales.map((otra) => (otra.id === cita.id ? { ...otra, estado } : otra)),
      );
    } catch (error) {
      informarError("No se pudo actualizar el turno", error);
    } finally {
      setOcupado(null);
    }
  }

  function abrirFormulario(recursoId?: string) {
    const recurso = recursos.find(({ id }) => id === recursoId) ?? recursos[0];
    if (!recurso) return;
    setFormulario({
      abierto: true,
      recursoId: recurso.id,
      productoId: "",
      fecha: diaElegido,
      hora: "09:00",
      duracion: String(recurso.duracion_minutos ?? 30),
      nombre: "",
      telefono: "",
      notaInterna: "",
    });
  }

  async function guardarManual() {
    if (!formulario) return;
    setCargando(true);
    try {
      const respuesta = await fetch("/api/catalogo/citas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recursoId: formulario.recursoId,
          productoId: formulario.productoId || null,
          inicio: instanteDe(formulario.fecha, formulario.hora),
          duracionMinutos: Number(formulario.duracion),
          nombre: formulario.nombre,
          telefono: formulario.telefono,
          notaInterna: formulario.notaInterna,
        }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        cita?: { id: string; codigo: string };
      };
      if (!respuesta.ok || !datos.cita) throw new Error(datos.error || "No se pudo guardar.");

      const inicio = instanteDe(formulario.fecha, formulario.hora);
      setCitas((actuales) => [
        ...actuales,
        {
          id: datos.cita!.id,
          codigo: datos.cita!.codigo,
          recurso_id: formulario.recursoId,
          inicio,
          fin: new Date(new Date(inicio).getTime() + Number(formulario.duracion) * 60_000).toISOString(),
          producto: servicios.find(({ id }) => id === formulario.productoId)?.nombre ?? null,
          nombre_cliente: formulario.nombre.trim(),
          telefono_cliente: formulario.telefono.trim() || null,
          nota: null,
          nota_interna: formulario.notaInterna.trim() || null,
          estado: "confirmada",
          origen: "manual",
        },
      ]);
      setDiaElegido(formulario.fecha);
      setFormulario(null);
      mostrarAviso({ titulo: "Turno cargado", variante: "exito" });
    } catch (error) {
      informarError("No se pudo cargar el turno", error);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className={styles.pantalla}>
      {/* ── Quién atiende ─────────────────────────────────────────────── */}
      <section className={styles.bloque}>
        <header className={styles.cabecera}>
          <h2>Quién atiende</h2>
          <p>
            Cada persona o consultorio tiene su propio horario y su propio calendario. Dos
            servicios del mismo recurso no se pueden dar a la misma hora.
          </p>
        </header>

        {recursos.length === 0 ? (
          <p className={styles.vacio}>
            Todavía no cargaste a nadie. Empezá por quien atiende: «Dr. Ana», «Consultorio 1».
          </p>
        ) : null}

        <ul className={styles.recursos}>
          {recursos.map((recurso) => {
            const franjas = leerFranjas(recurso.franjas);
            const abierto = recursoAbierto === recurso.id;
            return (
              <li className={styles.recurso} key={recurso.id}>
                <div className={styles.recursoCabecera}>
                  <div>
                    <strong>{recurso.nombre}</strong>
                    <small>{resumirFranjas(franjas)}</small>
                  </div>

                  {/* El botón de apagar. Un gesto, sin confirmación: es lo que
                      el dueño toca a las 7 de la mañana cuando el doctor avisa
                      que no viene, y volver a encenderlo es el mismo gesto. */}
                  <label className={styles.interruptor}>
                    <input
                      checked={recurso.acepta_reservas}
                      disabled={ocupado === recurso.id}
                      onChange={(evento) =>
                        void cambiarRecurso(recurso.id, { acepta_reservas: evento.target.checked })
                      }
                      type="checkbox"
                    />
                    <span>{recurso.acepta_reservas ? "Recibe reservas" : "Reservas apagadas"}</span>
                  </label>

                  <Boton
                    onClick={() => setRecursoAbierto(abierto ? null : recurso.id)}
                    type="button"
                    variante="secundario"
                  >
                    {abierto ? "Cerrar" : "Horario"}
                  </Boton>
                </div>

                {!recurso.acepta_reservas ? (
                  <p className={styles.apagado}>
                    El catálogo no ofrece horarios de {recurso.nombre}. Vos seguís pudiendo cargar
                    turnos a mano.
                  </p>
                ) : null}

                {abierto ? <EditorDeAgenda recursoId={recurso.id} /> : null}
              </li>
            );
          })}
        </ul>

        <div className={styles.nuevo}>
          <Campo
            etiqueta="Agregar a alguien"
            id="nuevo-recurso"
            maxLength={60}
            onChange={(evento) => setNuevoNombre(evento.target.value)}
            placeholder="Dr. Ana, Peluquero, Consultorio 2"
            value={nuevoNombre}
          />
          <Boton cargando={cargando} disabled={nuevoNombre.trim() === ""} onClick={() => void crearRecurso()} type="button">
            Agregar
          </Boton>
        </div>
      </section>

      {/* ── Cronograma ────────────────────────────────────────────────── */}
      <section className={styles.bloque}>
        <header className={styles.cabecera}>
          <h2>Cronograma</h2>
          <p>
            Lo que llega del catálogo entra <strong>sin confirmar</strong>. Confirmalo si te
            parece serio, o cancelalo y la hora vuelve a ofrecerse.
          </p>
        </header>

        {/* Lo que espera una decisión, junto y arriba, sin importar de qué día
            sea. Es lo primero que el dueño busca al abrir la Agenda, y hacerlo
            recorrer los días para encontrarlo es esconderle su propio trabajo. */}
        {pendientes.length > 0 ? (
          <div className={styles.pendientes}>
            <h3>
              Esperan tu confirmación <span>{pendientes.length}</span>
            </h3>
            <ul className={styles.citas}>
              {pendientes.map((cita) => (
                <TarjetaCita
                  cita={cita}
                  conFecha
                  key={cita.id}
                  ocupado={ocupado === cita.id}
                  onCambiarEstado={cambiarEstado}
                  recursoNombre={recursos.find(({ id }) => id === cita.recurso_id)?.nombre ?? "—"}
                />
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles.dias}>
          {dias.map((dia) => (
            <button
              aria-pressed={dia.fecha === diaElegido}
              className={dia.fecha === diaElegido ? styles.diaActivo : styles.dia}
              key={dia.fecha}
              onClick={() => setDiaElegido(dia.fecha)}
              type="button"
            >
              {rotuloDia(dia.fecha)}
              {dia.cantidad > 0 ? <small>{dia.cantidad}</small> : null}
            </button>
          ))}
        </div>

        <div className={styles.accionesDia}>
          <Boton disabled={recursos.length === 0} onClick={() => abrirFormulario()} type="button" variante="secundario">
            Cargar un turno a mano
          </Boton>
        </div>

        {formulario?.abierto ? (
          <div className={styles.formulario}>
            <h3>Turno a mano</h3>
            <p className={styles.ayuda}>
              Para lo que llega por teléfono, o para bloquear una hora. En «nombre» podés
              poner el motivo: «Reunión», «Banco».
            </p>
            <div className={styles.rejilla}>
              <Selector
                etiqueta="Quién atiende"
                id="manual-recurso"
                onChange={(evento) => setFormulario({ ...formulario, recursoId: evento.target.value })}
                value={formulario.recursoId}
              >
                {recursos.map((recurso) => (
                  <option key={recurso.id} value={recurso.id}>
                    {recurso.nombre}
                  </option>
                ))}
              </Selector>
              <Selector
                etiqueta="Servicio (opcional)"
                id="manual-servicio"
                onChange={(evento) => setFormulario({ ...formulario, productoId: evento.target.value })}
                value={formulario.productoId}
              >
                <option value="">Sin servicio · bloqueo o llamada</option>
                {servicios.map((servicio) => (
                  <option key={servicio.id} value={servicio.id}>
                    {servicio.nombre}
                  </option>
                ))}
              </Selector>
              <Campo
                etiqueta="Día"
                id="manual-fecha"
                onChange={(evento) => setFormulario({ ...formulario, fecha: evento.target.value })}
                type="date"
                value={formulario.fecha}
              />
              <Campo
                etiqueta="Hora"
                id="manual-hora"
                onChange={(evento) => setFormulario({ ...formulario, hora: evento.target.value })}
                type="time"
                value={formulario.hora}
              />
              <Campo
                etiqueta="Duración (minutos)"
                id="manual-duracion"
                inputMode="numeric"
                onChange={(evento) => setFormulario({ ...formulario, duracion: evento.target.value })}
                value={formulario.duracion}
              />
              <Campo
                etiqueta="Nombre o motivo"
                id="manual-nombre"
                maxLength={80}
                onChange={(evento) => setFormulario({ ...formulario, nombre: evento.target.value })}
                placeholder="María Rojas · Reunión · Banco"
                required
                value={formulario.nombre}
              />
              <Campo
                etiqueta="WhatsApp (opcional)"
                id="manual-telefono"
                inputMode="tel"
                onChange={(evento) => setFormulario({ ...formulario, telefono: evento.target.value })}
                placeholder="7XXXXXXX"
                value={formulario.telefono}
              />
              <Campo
                ayuda="Solo la ves vos. Para acordarte por qué está ocupado."
                etiqueta="Nota (opcional)"
                id="manual-nota"
                maxLength={300}
                onChange={(evento) => setFormulario({ ...formulario, notaInterna: evento.target.value })}
                value={formulario.notaInterna}
              />
            </div>
            <div className={styles.accionesFormulario}>
              <Boton onClick={() => setFormulario(null)} type="button" variante="secundario">
                Cancelar
              </Boton>
              <Boton
                cargando={cargando}
                disabled={formulario.nombre.trim() === ""}
                onClick={() => void guardarManual()}
                type="button"
              >
                Guardar el turno
              </Boton>
            </div>
          </div>
        ) : null}

        {citasDelDia.length === 0 ? (
          <p className={styles.vacio}>
            {pendientesDelDia > 0
              ? `${pendientesDelDia} ${
                  pendientesDelDia === 1 ? "turno espera" : "turnos esperan"
                } tu confirmación arriba. Nada confirmado todavía para ${rotuloDia(diaElegido)}.`
              : `Nada confirmado para ${rotuloDia(diaElegido)}.`}
          </p>
        ) : (
          <ul className={styles.citas}>
            {citasDelDia.map((cita) => (
              <TarjetaCita
                cita={cita}
                key={cita.id}
                ocupado={ocupado === cita.id}
                onCambiarEstado={cambiarEstado}
                recursoNombre={recursos.find(({ id }) => id === cita.recurso_id)?.nombre ?? "—"}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* Una cita, con sus acciones. La misma tarjeta sirve en la lista de pendientes
   —donde lleva la fecha, porque son de días distintos— y en la del día —donde
   no, porque el día ya está elegido arriba—. */
function TarjetaCita({
  cita,
  recursoNombre,
  ocupado,
  conFecha = false,
  onCambiarEstado,
}: {
  cita: CitaAgenda;
  recursoNombre: string;
  ocupado: boolean;
  conFecha?: boolean;
  onCambiarEstado: (cita: CitaAgenda, estado: string) => Promise<void>;
}) {
  return (
    <li className={styles.cita} data-estado={cita.estado}>
      <div className={styles.cuando}>
        <strong>
          {conFecha ? `${rotuloDia(fechaDe(cita.inicio))} · ` : ""}
          {horaDe(cita.inicio)}–{horaDe(cita.fin)}
        </strong>
        <span>{recursoNombre}</span>
      </div>

      <div className={styles.quien}>
        <strong>{cita.nombre_cliente}</strong>
        {cita.producto ? <span>{cita.producto}</span> : <span>Bloqueo</span>}
        {cita.telefono_cliente ? (
          <a href={`https://wa.me/${cita.telefono_cliente}`} rel="noopener noreferrer" target="_blank">
            {cita.telefono_cliente}
          </a>
        ) : null}
        {cita.nota ? <em>Dice: {cita.nota}</em> : null}
        {cita.nota_interna ? <em className={styles.notaInterna}>{cita.nota_interna}</em> : null}
      </div>

      <div className={styles.estado}>
        {ROTULOS[cita.estado] ?? cita.estado}
        {cita.origen === "manual" ? <small> · a mano</small> : null}
      </div>

      {cita.estado === "pendiente" || cita.estado === "confirmada" ? (
        <div className={styles.acciones}>
          {cita.estado === "pendiente" ? (
            <Boton cargando={ocupado} onClick={() => void onCambiarEstado(cita, "confirmada")} type="button">
              Confirmar
            </Boton>
          ) : (
            <Boton cargando={ocupado} onClick={() => void onCambiarEstado(cita, "cumplida")} type="button" variante="secundario">
              Cumplido
            </Boton>
          )}
          <Boton disabled={ocupado} onClick={() => void onCambiarEstado(cita, "cancelada")} type="button" variante="peligro">
            Cancelar
          </Boton>
        </div>
      ) : null}
    </li>
  );
}
