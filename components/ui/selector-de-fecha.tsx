"use client";

import { useEffect, useId, useRef, useState } from "react";

import { conMayuscula, fechaParaLeer } from "../../lib/calendario";
import { Icono } from "../iconos/icono";
import { Calendario } from "./calendario";
import styles from "./selector-de-fecha.module.css";

/* Un campo de fecha que abre el calendario del panel.
 *
 * Dice la fecha como se lee —«jueves 15 de octubre»— y no «10/15/2026». En una
 * pantalla ancha el calendario se despliega debajo del campo; en un teléfono
 * sube desde abajo, como una hoja, con el dedo a mano. Se cierra al elegir, con
 * Escape o tocando afuera. Reemplaza a `type="date"` en el panel. */
export function SelectorDeFecha({
  id,
  etiqueta,
  valor,
  alCambiar,
  hoy,
  minimo,
  maximo,
  permiteVacio = false,
  textoVacio = "Elige un día",
  ayuda,
}: {
  id: string;
  etiqueta: string;
  /* `AAAA-MM-DD`, o vacío. */
  valor: string;
  alCambiar: (fecha: string) => void;
  hoy: string;
  minimo?: string;
  maximo?: string;
  /* Si se puede dejar sin fecha: «Sin vencimiento», por ejemplo. */
  permiteVacio?: boolean;
  textoVacio?: string;
  ayuda?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const marco = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const idPanel = useId();
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;

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
    /* Al abrir, el foco va al día elegido (o a hoy), para seguir con el teclado. */
    requestAnimationFrame(() =>
      marco.current?.querySelector<HTMLButtonElement>('[data-calendario-dia][tabindex="0"]')?.focus(),
    );
    return () => {
      document.removeEventListener("pointerdown", alTocarAfuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  function elegir(fecha: string) {
    alCambiar(fecha);
    setAbierto(false);
    boton.current?.focus();
  }

  return (
    <div className={styles.grupo} ref={marco}>
      <label className={styles.etiqueta} htmlFor={id}>
        {etiqueta}
      </label>
      <button
        aria-controls={abierto ? idPanel : undefined}
        aria-describedby={idAyuda}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        className={styles.campo}
        data-vacio={valor ? undefined : "si"}
        id={id}
        onClick={() => setAbierto((actual) => !actual)}
        ref={boton}
        type="button"
      >
        <Icono className={styles.icono} nombre="calendario" />
        <span>{valor ? conMayuscula(fechaParaLeer(valor, hoy)) : textoVacio}</span>
      </button>
      {ayuda ? (
        <p className={styles.ayuda} id={idAyuda}>
          {ayuda}
        </p>
      ) : null}

      {abierto ? (
        <>
          {/* El velo solo se ve en un teléfono, donde el calendario sube como
              hoja: tocarlo cierra, igual que tocar afuera. */}
          <div aria-hidden="true" className={styles.velo} />
          <div aria-label={etiqueta} className={styles.panel} id={idPanel} role="dialog">
            <Calendario
              alElegir={elegir}
              etiqueta={etiqueta}
              hoy={hoy}
              maximo={maximo}
              minimo={minimo}
              valor={valor || null}
            />
            <div className={styles.pie}>
              {permiteVacio && valor ? (
                <button className={styles.accion} onClick={() => elegir("")} type="button">
                  Quitar la fecha
                </button>
              ) : null}
              <button
                className={styles.accion}
                onClick={() => {
                  setAbierto(false);
                  boton.current?.focus();
                }}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
