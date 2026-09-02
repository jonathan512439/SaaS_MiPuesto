import type { TextareaHTMLAttributes } from "react";

import styles from "./ui.module.css";

type PropiedadesAreaTexto = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
};

export function AreaTexto({
  id,
  etiqueta,
  ayuda,
  error,
  className,
  required,
  ...propiedades
}: PropiedadesAreaTexto) {
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;
  const descripcion = [idAyuda, idError].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.grupoCampo}>
      <div className={styles.filaEtiqueta}>
        <label className={styles.etiqueta} htmlFor={id}>
          {etiqueta}
        </label>
        {required ? <span className={styles.requerido}>Obligatorio</span> : null}
      </div>
      <textarea
        {...propiedades}
        aria-describedby={descripcion}
        aria-invalid={error ? true : undefined}
        className={[
          styles.campo,
          styles.areaTexto,
          error ? styles.campoError : "",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        id={id}
        required={required}
      />
      {ayuda ? (
        <p className={styles.ayuda} id={idAyuda}>
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p className={styles.mensajeError} id={idError}>
          <span aria-hidden="true">!</span> {error}
        </p>
      ) : null}
    </div>
  );
}
