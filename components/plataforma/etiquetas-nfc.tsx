"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  dominioDeEtiquetasConectado,
  enlaceDeEtiqueta,
} from "../../lib/plataforma/etiquetas";
import { Boton, useAvisos, useConfirmacion } from "../ui";
import styles from "./etiquetas-nfc.module.css";

export type EtiquetaPlataforma = {
  codigo: string;
  negocio_id: string | null;
  nota: string | null;
  creado_en: string;
  ultimo_uso_en: string | null;
};

type NegocioBreve = { id: string; nombre: string };

const FORMATEADOR = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function EtiquetasNfc({
  etiquetas,
  negocios,
}: {
  etiquetas: EtiquetaPlataforma[];
  negocios: NegocioBreve[];
}) {
  const router = useRouter();
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();
  const [nota, setNota] = useState("");
  const [ocupado, setOcupado] = useState("");
  const dominioConectado = dominioDeEtiquetasConectado();

  async function pedir(cuerpo: Record<string, unknown>, ocupada: string, exito: string) {
    setOcupado(ocupada);
    try {
      const respuesta = await fetch("/api/plataforma/etiquetas", {
        body: JSON.stringify(cuerpo),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const datos = (await respuesta.json()) as { error?: string; etiqueta?: EtiquetaPlataforma };
      if (!respuesta.ok) throw new Error(datos.error ?? "No se pudo completar la acción.");
      mostrarAviso({
        titulo: exito,
        mensaje: datos.etiqueta ? `Código ${datos.etiqueta.codigo}.` : undefined,
        variante: "exito",
      });
      setNota("");
      router.refresh();
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo completar",
        mensaje: error instanceof Error ? error.message : "Intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setOcupado("");
    }
  }

  /* El enlace se copia entero, listo para pegar en la app que graba la
     etiqueta: escribirlo a mano en el teléfono es donde se cuela un 8 por una
     B y la etiqueta queda grabada para siempre apuntando a la nada. */
  async function copiarEnlace(codigo: string) {
    const enlace = enlaceDeEtiqueta(codigo);
    try {
      await navigator.clipboard.writeText(enlace);
      mostrarAviso({
        titulo: "Enlace copiado",
        mensaje: "Pégalo como URL en la app que graba la etiqueta NFC.",
        variante: "exito",
      });
    } catch {
      mostrarAviso({ titulo: "Copia el enlace a mano", mensaje: enlace, variante: "informacion" });
    }
  }

  async function eliminar(etiqueta: EtiquetaPlataforma) {
    /* La advertencia fuerte solo para la que ya pudo salir a la calle: la que
       apunta a un negocio o ya se escaneó puede estar pegada en una mesa. */
    const enUso = etiqueta.negocio_id !== null || etiqueta.ultimo_uso_en !== null;
    const aceptado = await confirmar({
      titulo: `Eliminar la etiqueta ${etiqueta.codigo}`,
      descripcion: enUso
        ? "Si ya está grabada en un NFC o impresa en un QR, deja de abrir: quien la escanee verá la página de no encontrado. Para cambiar a dónde lleva no hace falta eliminarla, elige otro negocio en «Apunta a»."
        : "Nunca se escaneó ni apunta a ningún negocio.",
      destructiva: true,
      textoAccion: "Eliminar etiqueta",
    });
    if (!aceptado) return;
    await pedir(
      { accion: "eliminar", codigo: etiqueta.codigo },
      etiqueta.codigo,
      "Etiqueta eliminada",
    );
  }

  return (
    <section aria-labelledby="etiquetas" className={styles.panel}>
      <header>
        <h2 id="etiquetas">Etiquetas NFC y QR</h2>
        <p>
          El código va impreso en el plástico y se puede reapuntar a otro negocio sin
          reimprimir nada. Copia el enlace de cada etiqueta y grábalo como URL en el NFC, o
          úsalo para el QR.
        </p>
      </header>

      {/* Mientras el dominio no esté conectado, el enlace copiado no abre nada.
          Se dice acá y no en cada fila: es una sola condición para todo el lote. */}
      {!dominioConectado ? (
        <p className={styles.aviso} role="note">
          <strong>mi-puesto.com todavía no está conectado.</strong> Los enlaces copiados abren
          recién cuando lo conectes. Para revisar ahora a dónde lleva una etiqueta, usa «Probar».
        </p>
      ) : null}

      <div className={styles.crear}>
        <label htmlFor="etiqueta-nota">Para qué es (opcional)</label>
        <input
          id="etiqueta-nota"
          maxLength={120}
          onChange={(evento) => setNota(evento.target.value)}
          placeholder="Ej.: lote de 20, mesas del salón"
          value={nota}
        />
        <Boton
          cargando={ocupado === "crear"}
          disabled={ocupado !== ""}
          onClick={() => void pedir({ accion: "crear", nota }, "crear", "Etiqueta creada")}
        >
          Crear etiqueta
        </Boton>
      </div>

      {etiquetas.length === 0 ? (
        <p className={styles.vacio}>Todavía no hay etiquetas creadas.</p>
      ) : (
        <ul className={styles.lista}>
          {etiquetas.map((etiqueta) => (
            <li className={styles.fila} key={etiqueta.codigo}>
              <div className={styles.datos}>
                <strong className={styles.codigo}>{etiqueta.codigo}</strong>
                {etiqueta.nota ? <p className={styles.nota}>{etiqueta.nota}</p> : null}
                <p className={styles.uso}>
                  {etiqueta.ultimo_uso_en
                    ? `Último escaneo: ${FORMATEADOR.format(new Date(etiqueta.ultimo_uso_en))}`
                    : "Nunca escaneada"}
                </p>
                <code className={styles.enlace}>{enlaceDeEtiqueta(etiqueta.codigo)}</code>
              </div>

              <label className={styles.asignar}>
                <span>Apunta a</span>
                <select
                  disabled={ocupado !== ""}
                  onChange={(evento) =>
                    void pedir(
                      evento.target.value
                        ? {
                            accion: "asignar",
                            codigo: etiqueta.codigo,
                            negocio_id: evento.target.value,
                          }
                        : { accion: "liberar", codigo: etiqueta.codigo },
                      etiqueta.codigo,
                      evento.target.value ? "Etiqueta reapuntada" : "Etiqueta liberada",
                    )
                  }
                  value={etiqueta.negocio_id ?? ""}
                >
                  <option value="">Sin asignar</option>
                  {negocios.map((negocio) => (
                    <option key={negocio.id} value={negocio.id}>
                      {negocio.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.acciones}>
                <Boton
                  disabled={ocupado !== ""}
                  onClick={() => void copiarEnlace(etiqueta.codigo)}
                  variante="secundario"
                >
                  Copiar enlace
                </Boton>
                {/* Relativo a propósito: abre en la dirección de donde sirve hoy
                    el sitio, así se prueba antes de que el dominio esté
                    conectado. Y cuenta como escaneo, igual que uno real. */}
                <a href={`/t/${etiqueta.codigo}`} rel="noreferrer" target="_blank">
                  Probar
                </a>
                <Boton
                  cargando={ocupado === etiqueta.codigo}
                  disabled={ocupado !== ""}
                  onClick={() => void eliminar(etiqueta)}
                  variante="peligro"
                >
                  Eliminar
                </Boton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
