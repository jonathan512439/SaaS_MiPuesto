"use client";

import { useEffect, useId, useRef, useState } from "react";

import { RATOS_DEL_DIA, minutosDelPaso } from "../../lib/calendario";
import { Icono } from "../iconos/icono";
import campo from "./selector-de-fecha.module.css";
import styles from "./selector-de-hora.module.css";

/* Un campo de hora en 24 horas, elegida en dos toques: la hora y los minutos.
 *
 * Reemplazó a `type="time"`, que mostraba «02:30 PM», y después a un
 * desplegable con las noventa y seis horas del día cada quince minutos, que
 * había que recorrer entero. Pedido por el dueño el 2026-10-16: «otro estilo
 * para las horas». Ahora se abre como el calendario —debajo del campo en una
 * pantalla ancha, como hoja en un teléfono—: las veinticuatro horas en cuatro
 * filas con el rato del día (madrugada, mañana, tarde, noche) y, debajo, los
 * minutos del paso. Elegir los minutos cierra. Si la hora guardada no cae en
 * el paso —«09:07», cargada antes—, se sigue mostrando y ofreciendo. */
export function SelectorDeHora({
  id,
  etiqueta,
  valor,
  alCambiar,
  paso = 15,
  desde,
  ayuda,
  required,
  descripcion,
  textoVacio,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  alCambiar: (hora: string) => void;
  paso?: number;
  /* La primera hora que se ofrece, si antes de ella no tiene sentido. */
  desde?: string;
  ayuda?: string;
  required?: boolean;
  /* Lo que oye un lector de pantalla cuando la etiqueta visible es corta y se
     repite: «Abre» siete veces no dice de qué día. */
  descripcion?: string;
  /* Si se puede dejar sin hora, lo que dice esa opción: «Sin hora». */
  textoVacio?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const marco = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const idPanel = useId();
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;

  const horaElegida = valor ? valor.slice(0, 2) : null;
  const minutoElegido = valor ? valor.slice(3, 5) : null;
  const minutos = minutosDelPaso(paso, valor);

  useEffect(() => {
    if (!abierto) return;
    function alTocarAfuera(evento: PointerEvent) {
      if (marco.current && !marco.current.contains(evento.target as Node)) setAbierto(false);
    }
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    }
    document.addEventListener("pointerdown", alTocarAfuera);
    document.addEventListener("keydown", alTeclear);
    requestAnimationFrame(() =>
      marco.current?.querySelector<HTMLButtonElement>('[data-hora][aria-pressed="true"], [data-hora]')?.focus(),
    );
    return () => {
      document.removeEventListener("pointerdown", alTocarAfuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  function cerrar() {
    setAbierto(false);
    boton.current?.focus();
  }

  /* La hora cambia y los minutos se conservan; sin minutos todavía, en punto. */
  function elegirHora(hora: string) {
    alCambiar(`${hora}:${minutoElegido ?? "00"}`);
  }

  function elegirMinutos(minuto: string) {
    alCambiar(`${horaElegida ?? "09"}:${minuto}`);
    cerrar();
  }

  const fueraDeRango = (hora: string) => Boolean(desde && `${hora}:59` < desde);

  return (
    <div className={campo.grupo} ref={marco}>
      <div className={styles.filaEtiqueta}>
        <label className={campo.etiqueta} htmlFor={id}>
          {etiqueta}
        </label>
        {required ? <span className={styles.requerido}>Obligatorio</span> : null}
      </div>
      <button
        aria-controls={abierto ? idPanel : undefined}
        aria-describedby={idAyuda}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        aria-label={descripcion ? `${descripcion}: ${valor || textoVacio || "sin elegir"}` : undefined}
        className={campo.campo}
        data-vacio={valor ? undefined : "si"}
        id={id}
        onClick={() => setAbierto((actual) => !actual)}
        ref={boton}
        type="button"
      >
        <Icono className={campo.icono} nombre="reloj" />
        <span className={styles.valor}>{valor || textoVacio || "Elige la hora"}</span>
      </button>
      {ayuda ? (
        <p className={campo.ayuda} id={idAyuda}>
          {ayuda}
        </p>
      ) : null}

      {abierto ? (
        <>
          <div aria-hidden="true" className={campo.velo} />
          <div aria-label={descripcion ?? etiqueta} className={`${campo.panel} ${styles.panel}`} id={idPanel} role="dialog">
            <p className={styles.paso}>1 · La hora</p>
            <div className={styles.ratos}>
              {RATOS_DEL_DIA.map((rato) => (
                <div className={styles.rato} key={rato.nombre} role="group" aria-label={rato.nombre}>
                  <span className={styles.nombreRato}>{rato.nombre}</span>
                  <div className={styles.horas}>
                    {rato.horas.map((hora) => (
                      <button
                        aria-label={`${hora} horas`}
                        aria-pressed={hora === horaElegida}
                        className={styles.opcion}
                        data-hora={hora}
                        disabled={fueraDeRango(hora)}
                        key={hora}
                        onClick={() => elegirHora(hora)}
                        type="button"
                      >
                        {hora}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className={styles.paso}>2 · Los minutos</p>
            <div className={styles.minutos} role="group" aria-label="Minutos">
              {minutos.map((minuto) => (
                <button
                  aria-label={`${horaElegida ?? "09"}:${minuto}`}
                  aria-pressed={minuto === minutoElegido}
                  className={styles.opcion}
                  key={minuto}
                  onClick={() => elegirMinutos(minuto)}
                  type="button"
                >
                  :{minuto}
                </button>
              ))}
            </div>

            <div className={campo.pie}>
              {textoVacio !== undefined && valor ? (
                <button
                  className={campo.accion}
                  onClick={() => {
                    alCambiar("");
                    cerrar();
                  }}
                  type="button"
                >
                  {textoVacio}
                </button>
              ) : null}
              <button className={campo.accion} onClick={cerrar} type="button">
                Listo
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
