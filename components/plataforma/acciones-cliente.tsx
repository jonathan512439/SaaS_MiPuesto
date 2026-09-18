"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PLANES, planDe } from "../../lib/planes";
import { useAvisos, useConfirmacion } from "../ui";
import styles from "./acciones-cliente.module.css";

type PropiedadesAcciones = {
  negocioId: string;
  nombre: string;
  activo: boolean;
  suspendidoPorPago: boolean;
  fotoIaHabilitada: boolean;
  fotosUsadas: number;
  topeFotos: number;
  planId: string;
};

type Accion = "renovar" | "publicar" | "despublicar" | "foto_ia" | "plan";

/* Usa los mismos avisos y confirmaciones que el panel del negocio: bajar un
   catálogo es destructivo para el comerciante, y esa confirmación tiene que
   arrancar con el foco en la salida segura. */
export function AccionesCliente({
  negocioId,
  nombre,
  activo,
  suspendidoPorPago,
  fotoIaHabilitada,
  fotosUsadas,
  topeFotos,
  planId,
}: PropiedadesAcciones) {
  const router = useRouter();
  const [meses, setMeses] = useState("1");
  const [plan, setPlan] = useState(planDe(planId).id);
  const [ocupado, setOcupado] = useState<Accion | null>(null);
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();

  async function ejecutar(accion: Accion, plan?: string) {
    if (accion === "despublicar") {
      const aceptado = await confirmar({
        titulo: `Bajar el catálogo de ${nombre}`,
        descripcion: "Sus clientes dejan de verlo. Los datos no se borran.",
        destructiva: true,
        textoAccion: "Bajar catálogo",
      });
      if (!aceptado) return;
    }

    /* Encender la lectura de fotos es lo único de esta pantalla que empieza a
       gastar dinero cada vez que el comerciante la use. Se confirma con el
       número delante para que nadie la encienda de paso. */
    if (accion === "foto_ia" && !fotoIaHabilitada) {
      const aceptado = await confirmar({
        titulo: `Habilitar lectura de fotos para ${nombre}`,
        descripcion: `Cada foto que lea tiene costo. Su tope es de ${topeFotos} fotos por mes.`,
        textoAccion: "Habilitar",
        textoCancelar: "Dejar apagada",
      });
      if (!aceptado) return;
    }

    setOcupado(accion);
    try {
      const respuesta = await fetch("/api/plataforma/negocios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          negocio_id: negocioId,
          accion,
          meses: Number(meses),
          habilitada: !fotoIaHabilitada,
          plan,
        }),
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

      {/* El plan decide cuánto puede leer el negocio con la IA, así que se
          cambia acá y no en el panel del dueño: si el dueño pudiera tocarlo, se
          ascendería solo. La columna tampoco está concedida para escritura. */}
      <div className={styles.renovar}>
        <label htmlFor={`plan-${negocioId}`}>Plan</label>
        <select
          disabled={ocupado !== null}
          id={`plan-${negocioId}`}
          onChange={(evento) => {
            setPlan(evento.target.value as typeof plan);
            void ejecutar("plan", evento.target.value);
          }}
          value={plan}
        >
          {PLANES.map((opcion) => (
            <option key={opcion.id} value={opcion.id}>
              {opcion.nombre} — {opcion.lecturasPorMes}/mes
            </option>
          ))}
        </select>
      </div>

      <button
        className={fotoIaHabilitada ? styles.secundario : styles.principal}
        disabled={ocupado !== null}
        onClick={() => void ejecutar("foto_ia")}
        type="button"
      >
        {ocupado === "foto_ia"
          ? "Guardando…"
          : fotoIaHabilitada
            ? `Quitar lectura de fotos (${fotosUsadas}/${topeFotos} este mes)`
            : "Habilitar lectura de fotos"}
      </button>

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
