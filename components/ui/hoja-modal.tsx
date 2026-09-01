"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";

import styles from "./ui.module.css";

type PropiedadesHojaModal = {
  abierta: boolean;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  acciones?: ReactNode;
  onCerrar: () => void;
};

export function HojaModal({
  abierta,
  titulo,
  descripcion,
  children,
  acciones,
  onCerrar,
}: PropiedadesHojaModal) {
  const referencia = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = referencia.current;

    if (!dialogo) return;

    if (abierta && !dialogo.open) dialogo.showModal();
    if (!abierta && dialogo.open) dialogo.close();
  }, [abierta]);

  return (
    <dialog
      aria-labelledby={idTitulo}
      className={styles.hojaModal}
      onCancel={(evento) => {
        evento.preventDefault();
        onCerrar();
      }}
      ref={referencia}
    >
      <div className={styles.cabeceraHoja}>
        <div>
          <h2 className={styles.tituloHoja} id={idTitulo}>
            {titulo}
          </h2>
          {descripcion ? <p className={styles.descripcionHoja}>{descripcion}</p> : null}
        </div>
        <button
          aria-label={`Cerrar ${titulo}`}
          className={styles.cerrarHoja}
          onClick={onCerrar}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div className={styles.contenidoHoja}>{children}</div>
      {acciones ? <div className={styles.accionesHoja}>{acciones}</div> : null}
    </dialog>
  );
}
