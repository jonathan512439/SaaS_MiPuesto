"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";

import type { PaletaId } from "../../lib/apariencia";
import temaStyles from "../templates/tema-catalogo.module.css";
import styles from "./hoja-catalogo.module.css";

type PropiedadesHoja = {
  abierta: boolean;
  titulo: string;
  paleta: PaletaId;
  children: ReactNode;
  onCerrar: () => void;
};

/* No reutiliza la hoja del panel a propósito: aquella usa los colores del
   producto y esta tiene que respetar la paleta que eligió el dueño. Comparte la
   mecánica —diálogo nativo, foco atrapado, Escape— y no el estilo. */
export function HojaCatalogo({
  abierta,
  titulo,
  paleta,
  children,
  onCerrar,
}: PropiedadesHoja) {
  const referencia = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;
    if (abierta && !dialogo.open) dialogo.showModal();
    if (!abierta && dialogo.open) dialogo.close();
  }, [abierta]);

  /* Con el diálogo abierto el fondo no debe desplazarse: en el celular, si se
     mueve, el cliente pierde el sitio del catálogo donde estaba mirando. */
  useEffect(() => {
    if (!abierta) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [abierta]);

  return (
    <dialog
      aria-labelledby={idTitulo}
      className={`${temaStyles.tema} ${styles.hoja}`}
      data-paleta={paleta}
      onCancel={(evento) => {
        evento.preventDefault();
        onCerrar();
      }}
      onClick={(evento) => {
        if (evento.target === referencia.current) onCerrar();
      }}
      ref={referencia}
    >
      <div className={styles.cabecera}>
        <h2 className={styles.titulo} id={idTitulo}>
          {titulo}
        </h2>
        <button
          aria-label="Cerrar el pedido y seguir mirando"
          className={styles.cerrar}
          onClick={onCerrar}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div className={styles.cuerpo}>{children}</div>
    </dialog>
  );
}
