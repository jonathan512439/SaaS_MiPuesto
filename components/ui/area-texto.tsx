import type { TextareaHTMLAttributes } from "react";

import styles from "./ui.module.css";

type PropiedadesAreaTexto = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
};

/* Cuántos caracteres faltan para que se avise que quedan pocos. */
const AVISAR_CUANDO_QUEDEN = 50;

/* El contador: cuánto lleva y cuánto acepta el campo.
 *
 * Un campo con tope cortaba en silencio al llegar al límite: el dueño seguía
 * escribiendo y el texto no aparecía, sin saber por qué. Pedido por el dueño
 * el 2026-10-13: «denotar y señalar los límites del campo de descripción».
 * Vale para todo campo largo con tope, no solo ese. */
export function textoDelContador(largo: number, maximo: number): string {
  const quedan = maximo - largo;
  if (quedan <= 0) return `${largo} de ${maximo} caracteres · llegaste al límite`;
  if (quedan <= AVISAR_CUANDO_QUEDEN) return `${largo} de ${maximo} caracteres · te quedan ${quedan}`;
  return `${largo} de ${maximo} caracteres`;
}

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
  const maximo = propiedades.maxLength;
  const largo = typeof propiedades.value === "string" ? propiedades.value.length : null;
  const idContador = maximo && largo !== null ? `${id}-contador` : undefined;
  const descripcion = [idAyuda, idContador, idError].filter(Boolean).join(" ") || undefined;

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
      {idContador && maximo && largo !== null ? (
        <p
          className={styles.contador}
          data-cerca={maximo - largo <= AVISAR_CUANDO_QUEDEN ? "si" : undefined}
          id={idContador}
        >
          {textoDelContador(largo, maximo)}
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
