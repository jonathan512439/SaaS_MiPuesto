"use client";

import { useState } from "react";

import { describirCita } from "../../lib/agenda/horarios";
import { Boton, useAvisos, useConfirmacion } from "../ui";
import styles from "./citas-del-dia.module.css";

/* Los turnos agendados, junto a los pedidos.
 *
 * En la misma pantalla y no en otra: para una veterinaria, «qué tengo hoy» son
 * las dos cosas juntas —tres bolsas de alimento para entregar y cuatro consultas
 * para atender—, y partirlas en dos menús obliga a mirar en dos lugares antes de
 * abrir.
 */

export type CitaAdmin = {
  id: string;
  codigo: string;
  inicio: string;
  producto: string;
  nombre_cliente: string;
  telefono_cliente: string;
  nota: string | null;
  estado: string;
};

const ROTULOS: Record<string, string> = {
  pendiente: "Sin confirmar",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  cumplida: "Cumplida",
};

export function CitasDelDia({ citasIniciales }: { citasIniciales: CitaAdmin[] }) {
  const [citas, setCitas] = useState(citasIniciales);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();

  async function cambiarEstado(cita: CitaAdmin, estado: string) {
    if (estado === "cancelada") {
      const seguro = await confirmar({
        titulo: `Cancelar el turno de ${cita.nombre_cliente}`,
        /* Se dice qué pasa con el horario: el dueño necesita saber que cancelar
           no es solo tachar una fila, es devolver ese turno al catálogo. */
        descripcion: `${describirCita(cita.inicio)}. El horario vuelve a quedar libre para otra persona.`,
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
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo actualizar el turno.");
      setCitas((actuales) =>
        actuales.map((otra) => (otra.id === cita.id ? { ...otra, estado } : otra)),
      );
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo actualizar el turno",
        mensaje: error instanceof Error ? error.message : "Intentá nuevamente.",
        variante: "error",
      });
    } finally {
      setOcupado(null);
    }
  }

  if (citas.length === 0) {
    return (
      <section className={styles.seccion}>
        <h2>Turnos agendados</h2>
        <p className={styles.vacio}>
          No tenés turnos por delante. Van a aparecer acá en cuanto alguien reserve.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.seccion}>
      <h2>Turnos agendados</h2>

      <ul className={styles.lista}>
        {citas.map((cita) => (
          <li className={styles.cita} key={cita.id}>
            <div className={styles.cuando}>
              <strong>{describirCita(cita.inicio)}</strong>
              <span className={styles.codigo}>{cita.codigo}</span>
            </div>

            <div className={styles.quien}>
              <strong>{cita.nombre_cliente}</strong>
              {/* El teléfono como enlace: el dueño va a querer llamar o escribir,
                  y copiarlo a mano en un teléfono es el paso donde se abandona. */}
              <a href={`https://wa.me/${cita.telefono_cliente}`} rel="noopener noreferrer" target="_blank">
                {cita.telefono_cliente}
              </a>
              <span>{cita.producto}</span>
              {cita.nota ? <em>{cita.nota}</em> : null}
            </div>

            <div className={styles.estado} data-estado={cita.estado}>
              {ROTULOS[cita.estado] ?? cita.estado}
            </div>

            {cita.estado === "pendiente" || cita.estado === "confirmada" ? (
              <div className={styles.acciones}>
                {cita.estado === "pendiente" ? (
                  <Boton
                    cargando={ocupado === cita.id}
                    onClick={() => void cambiarEstado(cita, "confirmada")}
                    type="button"
                  >
                    Confirmar
                  </Boton>
                ) : (
                  <Boton
                    cargando={ocupado === cita.id}
                    onClick={() => void cambiarEstado(cita, "cumplida")}
                    type="button"
                    variante="secundario"
                  >
                    Marcar cumplido
                  </Boton>
                )}
                <Boton
                  disabled={ocupado === cita.id}
                  onClick={() => void cambiarEstado(cita, "cancelada")}
                  type="button"
                  variante="peligro"
                >
                  Cancelar
                </Boton>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
