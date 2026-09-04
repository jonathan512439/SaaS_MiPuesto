"use client";

import styles from "./ui.module.css";

export type VarianteToast = "informacion" | "exito" | "advertencia" | "error";

type PropiedadesToast = {
  titulo: string;
  mensaje?: string;
  variante?: VarianteToast;
  anunciar?: boolean;
  onCerrar?: () => void;
};

const configuracion: Record<VarianteToast, { simbolo: string; clase: string }> = {
  informacion: { simbolo: "i", clase: styles.toastInformacion },
  exito: { simbolo: "✓", clase: styles.toastExito },
  advertencia: { simbolo: "!", clase: styles.toastAdvertencia },
  error: { simbolo: "×", clase: styles.toastError },
};

export function Toast({
  titulo,
  mensaje,
  variante = "informacion",
  anunciar = true,
  onCerrar,
}: PropiedadesToast) {
  const { simbolo, clase } = configuracion[variante];
  const urgente = variante === "advertencia" || variante === "error";

  return (
    <div
      aria-live={anunciar ? (urgente ? "assertive" : "polite") : undefined}
      className={[styles.toast, clase].join(" ")}
      role={anunciar ? (urgente ? "alert" : "status") : undefined}
    >
      <span aria-hidden="true" className={styles.simboloToast}>
        {simbolo}
      </span>
      <div>
        <p className={styles.tituloToast}>{titulo}</p>
        {mensaje ? <p className={styles.mensajeToast}>{mensaje}</p> : null}
      </div>
      {onCerrar ? (
        <button
          aria-label={`Cerrar aviso: ${titulo}`}
          className={styles.cerrarToast}
          onClick={onCerrar}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );
}
