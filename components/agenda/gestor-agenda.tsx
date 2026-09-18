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
  /* Cuántos atiende a la vez. Decide cuántos bloqueos hacen falta para cerrar
     un día: la base solo impide que se pisen dos citas del **mismo** cupo, así
     que con dos consultorios hay que ocupar los dos. */
  cupo_por_franja: number;
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

/* El motivo con el que se anota una pausa. Se ve en la agenda y en la lista del
   día, así que dice algo y no un código. */
const MOTIVO_CIERRE = "Reservas en pausa";

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
  /* El instante en que se abrió la pantalla. Se toma una vez y no en cada
     dibujo: leer el reloj mientras se dibuja da resultados que cambian solos,
     y React lo prohíbe por eso. El costo es que una pausa que vence con la
     pantalla abierta se sigue viendo hasta recargar, que para algo que dura
     horas o días no es un problema. */
  const [abiertoEn] = useState(() => Date.now());
  const [ocupado, setOcupado] = useState<string | null>(null);
  /* Qué recurso está eligiendo hasta cuándo pausar, con lo que lleva escrito.
     Uno por vez: dos formularios abiertos invitan a confundir cuál se guarda. */
  const [pausando, setPausando] = useState<{
    recursoId: string;
    fecha: string;
    hora: string;
  } | null>(null);
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

  /* Una pausa es una cita sin producto y con el motivo de las pausas. Se mira el
     motivo además de la falta de producto porque un bloqueo suelto —«Reunión»,
     «Banco»— también es una cita sin producto, y esos no son pausas: los carga
     el dueño a mano y los borra a mano. */
  function esPausa(cita: CitaAgenda) {
    return (
      cita.producto === null &&
      cita.estado !== "cancelada" &&
      cita.nombre_cliente === MOTIVO_CIERRE
    );
  }

  /* La pausa vigente de un recurso: la que todavía no terminó. Se mira contra
     ahora y no contra el día elegido, porque una pausa cruza días. */
  function pausaDe(recursoId: string) {
    return (
      citas.find(
        (cita) =>
          cita.recurso_id === recursoId && esPausa(cita) && new Date(cita.fin).getTime() > abiertoEn,
      ) ?? null
    );
  }

  /* Los turnos tomados dentro del rango que se va a pausar. Si hay alguno, la
     pausa chocaría con él en la base; y aunque no chocara, hay una persona
     esperando que le avisen. */
  function turnosEnRango(recursoId: string, desde: number, hasta: number) {
    return citas.filter(
      (cita) =>
        cita.recurso_id === recursoId &&
        cita.estado !== "cancelada" &&
        !esPausa(cita) &&
        new Date(cita.inicio).getTime() < hasta &&
        new Date(cita.fin).getTime() > desde,
    ).length;
  }

  /* Cerrar la jornada de un recurso: una cita por cada cupo, de la medianoche a
     la medianoche.
     **No cancela lo que ya está tomado**, y es a propósito: quien reservó espera
     que lo atiendan, y borrarle el turno sin avisarle es peor que el problema
     que se está resolviendo. Por eso el botón se apaga mientras haya turnos: el
     dueño los cancela uno por uno —hablando con cada cliente— y recién entonces
     cierra el día. */
  async function pausarReservas(recurso: RecursoAdmin, hastaFecha: string, hastaHora: string) {
    const desde = new Date();
    const hasta = new Date(instanteDe(hastaFecha, hastaHora));
    const minutos = Math.ceil((hasta.getTime() - desde.getTime()) / 60_000);

    if (minutos < 5) {
      informarError("No se pudo pausar", new Error("Elegí un momento más adelante."));
      return;
    }
    if (minutos > 43_200) {
      informarError("No se pudo pausar", new Error("La pausa puede durar hasta treinta días."));
      return;
    }

    const tomados = turnosEnRango(recurso.id, desde.getTime(), hasta.getTime());
    if (tomados > 0) {
      informarError(
        "No se pudo pausar",
        new Error(
          `Hay ${tomados} turno(s) tomado(s) en ese rango. Cancelalos primero: hay alguien esperando que le avises.`,
        ),
      );
      return;
    }

    setOcupado(recurso.id);
    try {
      const creadas: CitaAgenda[] = [];
      for (let cupo = 1; cupo <= Math.max(1, recurso.cupo_por_franja); cupo += 1) {
        const inicio = desde.toISOString();
        const respuesta = await fetch("/api/catalogo/citas", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            recursoId: recurso.id,
            productoId: null,
            inicio,
            duracionMinutos: minutos,
            cupo,
            nombre: MOTIVO_CIERRE,
          }),
        });
        const datos = (await respuesta.json().catch(() => ({}))) as {
          error?: string;
          cita?: { id: string; codigo: string };
        };
        if (!respuesta.ok || !datos.cita) throw new Error(datos.error || "No se pudo pausar.");

        creadas.push({
          id: datos.cita.id,
          codigo: datos.cita.codigo,
          recurso_id: recurso.id,
          inicio,
          fin: hasta.toISOString(),
          producto: null,
          nombre_cliente: MOTIVO_CIERRE,
          telefono_cliente: null,
          nota: null,
          nota_interna: null,
          estado: "confirmada",
          origen: "manual",
        });
      }
      setCitas((actuales) => [...actuales, ...creadas]);
      setPausando(null);
      mostrarAviso({
        titulo: `${recurso.nombre}: reservas en pausa`,
        mensaje: `Sus horarios dejan de ofrecerse hasta el ${hastaFecha} a las ${hastaHora}.`,
        variante: "exito",
      });
    } catch (error) {
      informarError("No se pudo pausar", error);
    } finally {
      setOcupado(null);
    }
  }

  /* Reabrir: se cancelan los bloqueos. La restricción de la base no mira las
     canceladas, así que con eso los horarios vuelven a ofrecerse. */
  async function reanudarReservas(recurso: RecursoAdmin) {
    const suyas = citas.filter((cita) => cita.recurso_id === recurso.id && esPausa(cita));
    setOcupado(recurso.id);
    try {
      for (const cierre of suyas) {
        const respuesta = await fetch("/api/catalogo/citas", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: cierre.id, estado: "cancelada" }),
        });
        const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
        if (!respuesta.ok) throw new Error(datos.error || "No se pudo reanudar.");
      }
      const ids = new Set(suyas.map(({ id }) => id));
      setCitas((actuales) =>
        actuales.map((cita) => (ids.has(cita.id) ? { ...cita, estado: "cancelada" } : cita)),
      );
      mostrarAviso({ titulo: `${recurso.nombre} vuelve a aceptar reservas`, variante: "exito" });
    } catch (error) {
      informarError("No se pudo reanudar", error);
    } finally {
      setOcupado(null);
    }
  }

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
      {/* El cronograma va primero y «Quién atiende» después: lo de arriba es lo
          que hay que resolver hoy —un turno tiene hora—, y lo de abajo se
          configura una vez y se toca cada tanto. Estaba al revés porque esta era
          la pantalla de la agenda, donde lo primero era armarla; ahora comparte
          pantalla con los pedidos, donde lo primero es atender. */}
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

        {/* Pausar las reservas de quien no va a atender: una emergencia, un
            viaje, una mesa que hoy no se usa.

            Es una pausa con vencimiento y no un «hoy no atiende» a secas porque
            así es como se dice de verdad: «hasta las cuatro», «hasta el lunes».
            Un botón que cierra el día entero obliga a acordarse de reabrirlo, y
            lo que se olvida es justo eso: el catálogo sigue sin dar turnos el
            martes porque nadie deshizo el bloqueo del lunes.

            Va por recurso y no por negocio porque lo normal es que falte uno y
            el resto siga. */}
        {recursos.some((recurso) => recurso.activo) ? (
          <div className={styles.cierres}>
            {recursos
              .filter((recurso) => recurso.activo)
              .map((recurso) => {
                const pausa = pausaDe(recurso.id);
                const eligiendo = pausando?.recursoId === recurso.id ? pausando : null;

                return (
                  <div className={styles.cierre} key={recurso.id}>
                    <span>{recurso.nombre}</span>
                    <button
                      disabled={ocupado !== null}
                      onClick={() => {
                        if (pausa) {
                          void reanudarReservas(recurso);
                          return;
                        }
                        setPausando(
                          eligiendo
                            ? null
                            : {
                                recursoId: recurso.id,
                                fecha: hoyEnBolivia(),
                                /* Hasta el final del día, que es la pausa que más
                                   se pide: «hoy ya no». Cambiarla es escribir otra
                                   hora, no armar nada. */
                                hora: "23:59",
                              },
                        );
                      }}
                      type="button"
                    >
                      {pausa
                        ? "Reanudar reservas"
                        : eligiendo
                          ? "Cancelar"
                          : "Pausar reservas"}
                    </button>

                    {pausa ? (
                      <small>
                        En pausa hasta el {rotuloDia(fechaDe(pausa.fin))} a las{" "}
                        {horaDe(pausa.fin)}. Sus horarios no se ofrecen en el catálogo.
                      </small>
                    ) : null}

                    {eligiendo ? (
                      <div className={styles.hastaCuando}>
                        <label>
                          Hasta el día
                          <input
                            min={hoyEnBolivia()}
                            onChange={(evento) =>
                              setPausando({ ...eligiendo, fecha: evento.target.value })
                            }
                            type="date"
                            value={eligiendo.fecha}
                          />
                        </label>
                        <label>
                          A las
                          <input
                            onChange={(evento) =>
                              setPausando({ ...eligiendo, hora: evento.target.value })
                            }
                            type="time"
                            value={eligiendo.hora}
                          />
                        </label>
                        <Boton
                          cargando={ocupado === recurso.id}
                          onClick={() =>
                            void pausarReservas(recurso, eligiendo.fecha, eligiendo.hora)
                          }
                          type="button"
                        >
                          Pausar
                        </Boton>
                      </div>
                    ) : null}
                  </div>
                );
              })}
          </div>
        ) : null}

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
