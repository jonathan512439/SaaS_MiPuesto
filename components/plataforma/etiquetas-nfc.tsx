"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Boton, useAvisos } from "../ui";
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
  const [nota, setNota] = useState("");
  const [ocupado, setOcupado] = useState("");

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
        mensaje: error instanceof Error ? error.message : "Intentá nuevamente.",
        variante: "error",
      });
    } finally {
      setOcupado("");
    }
  }

  return (
    <section aria-labelledby="etiquetas" className={styles.panel}>
      <header>
        <h2 id="etiquetas">Etiquetas NFC y QR</h2>
        <p>
          El código va impreso en el plástico y se puede reapuntar a otro negocio sin
          reimprimir nada. Se abre en <code>/t/CODIGO</code>.
        </p>
      </header>

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
              <div>
                <strong className={styles.codigo}>{etiqueta.codigo}</strong>
                {etiqueta.nota ? <p className={styles.nota}>{etiqueta.nota}</p> : null}
                <p className={styles.uso}>
                  {etiqueta.ultimo_uso_en
                    ? `Último escaneo: ${FORMATEADOR.format(new Date(etiqueta.ultimo_uso_en))}`
                    : "Nunca escaneada"}
                </p>
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
