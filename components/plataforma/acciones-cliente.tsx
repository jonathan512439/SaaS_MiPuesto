"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAvisos, useConfirmacion } from "../ui";
import styles from "./acciones-cliente.module.css";

type PropiedadesAcciones = {
  negocioId: string;
  nombre: string;
  activo: boolean;
  suspendidoPorPago: boolean;
};

type Accion = "renovar" | "publicar" | "despublicar";

/* Usa los mismos avisos y confirmaciones que el panel del negocio: bajar un
   catálogo es destructivo para el comerciante, y esa confirmación tiene que
   arrancar con el foco en la salida segura. */
export function AccionesCliente({
  negocioId,
  nombre,
  activo,
  suspendidoPorPago,
}: PropiedadesAcciones) {
  const router = useRouter();
  const [meses, setMeses] = useState("1");
  const [ocupado, setOcupado] = useState<Accion | null>(null);
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();

  async function ejecutar(accion: Accion) {
    if (accion === "despublicar") {
      const aceptado = await confirmar({
        titulo: `Bajar el catálogo de ${nombre}`,
        descripcion: "Sus clientes dejan de verlo. Los datos no se borran.",
        destructiva: true,
        textoAccion: "Bajar catálogo",
      });
      if (!aceptado) return;
    }

    setOcupado(accion);
    try {
      const respuesta = await fetch("/api/plataforma/negocios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ negocio_id: negocioId, accion, meses: Number(meses) }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo aplicar el cambio.");

      mostrarAviso({ titulo: `${nombre}: cambio aplicado`, variante: "exito" });
      router.refresh();
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo aplicar el cambio",
        mensaje: error instanceof Error ? error.message : "Intentá nuevamente.",
        variante: "error",
      });
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className={styles.acciones}>
      <div className={styles.renovar}>
        <label htmlFor={`meses-${negocioId}`}>Meses</label>
        <input
          id={`meses-${negocioId}`}
          inputMode="numeric"
          max="12"
          min="1"
          onChange={(evento) => setMeses(evento.target.value)}
          type="number"
          value={meses}
        />
        <button
          className={styles.principal}
          disabled={ocupado !== null}
          onClick={() => void ejecutar("renovar")}
          type="button"
        >
          {ocupado === "renovar" ? "Renovando…" : "Renovar"}
        </button>
      </div>

      {activo ? (
        <button
          className={styles.secundario}
          disabled={ocupado !== null}
          onClick={() => void ejecutar("despublicar")}
          type="button"
        >
          Bajar catálogo
        </button>
      ) : (
        <button
          className={styles.secundario}
          disabled={ocupado !== null}
          onClick={() => void ejecutar("publicar")}
          type="button"
        >
          {suspendidoPorPago ? "Publicar sin cobrar" : "Volver a publicar"}
        </button>
      )}
    </div>
  );
}
