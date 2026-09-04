"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

import styles from "./ui.module.css";

type PropiedadesCampoClave = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size" | "type"
> & {
  id: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
};

export function CampoClave({
  id,
  etiqueta,
  ayuda,
  error,
  className,
  required,
  disabled,
  ...propiedades
}: PropiedadesCampoClave) {
  const [visible, setVisible] = useState(false);
  const idAviso = useId();
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
      <div className={styles.envolturaClave}>
        <input
          {...propiedades}
          aria-describedby={descripcion}
          aria-invalid={error ? true : undefined}
          className={[
            styles.campo,
            styles.campoClave,
            error ? styles.campoError : "",
            className ?? "",
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={disabled}
          id={id}
          required={required}
          type={visible ? "text" : "password"}
        />
        <button
          className={styles.alternarClave}
          disabled={disabled}
          onClick={() => setVisible((estado) => !estado)}
          type="button"
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <p className={styles.avisoClave} id={idAviso} role="status">
        {visible ? "La contraseña está a la vista." : ""}
      </p>
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
