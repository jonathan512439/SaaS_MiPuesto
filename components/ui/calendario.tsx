"use client";

import { useState, type KeyboardEvent } from "react";

import {
  INICIALES_SEMANA,
  diaElegible,
  fechaParaLeer,
  mesDe,
  semanasDelMes,
  sumarDias,
  conMayuscula,
  tituloDelMes,
} from "../../lib/calendario";
import styles from "./calendario.module.css";

/* El calendario del panel: un mes a la vista, en español y empezando el lunes.
 *
 * Reemplaza al del navegador, que mostraba «10/15/2026», cambiaba de aspecto en
 * cada teléfono y no tomaba los colores de MiPuesto. Pedido por el dueño el
 * 2026-10-14: «un calendario más estético, en la web y en el celular».
 *
 * Hoy va marcado con un anillo; el día elegido, relleno; y si se le pasan
 * `marcas`, cada día dice cuántos turnos tiene, en número y no solo con un
 * punto de color. Se maneja con el teclado como un almanaque: flechas para
 * moverse por los días, la semana y los meses. Sin dependencias: son siete
 * columnas y una suma de días. */
const NOMBRES_SEMANA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export function Calendario({
  valor,
  alElegir,
  hoy,
  etiqueta,
  marcas,
  minimo,
  maximo,
}: {
  valor: string | null;
  alElegir: (fecha: string) => void;
  /* El día de hoy en Bolivia. Lo pasa quien lo usa, para que el servidor y el
     navegador dibujen lo mismo. */
  hoy: string;
  etiqueta: string;
  /* Cuántas cosas hay cada día —turnos—: se muestra el número. */
  marcas?: Readonly<Record<string, number>>;
  minimo?: string;
  maximo?: string;
}) {
  const [mesVisible, setMesVisible] = useState(() => mesDe(valor ?? hoy));
  const [enfocado, setEnfocado] = useState(valor ?? hoy);
  const semanas = semanasDelMes(mesVisible.anio, mesVisible.mes);

  function cambiarMes(salto: number) {
    const siguiente = new Date(Date.UTC(mesVisible.anio, mesVisible.mes + salto, 1));
    setMesVisible({ anio: siguiente.getUTCFullYear(), mes: siguiente.getUTCMonth() });
  }

  function moverFoco(fecha: string) {
    setEnfocado(fecha);
    const destino = mesDe(fecha);
    if (destino.anio !== mesVisible.anio || destino.mes !== mesVisible.mes) setMesVisible(destino);
    /* El botón del día nuevo existe recién en el próximo dibujo. */
    requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-calendario-dia="${fecha}"]`)?.focus();
    });
  }

  function alTeclear(evento: KeyboardEvent<HTMLTableElement>) {
    const saltos: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (evento.key in saltos) {
      evento.preventDefault();
      moverFoco(sumarDias(enfocado, saltos[evento.key]));
    } else if (evento.key === "PageUp" || evento.key === "PageDown") {
      evento.preventDefault();
      moverFoco(sumarDias(enfocado, evento.key === "PageUp" ? -30 : 30));
    }
  }

  return (
    <div aria-label={etiqueta} className={styles.calendario} role="group">
      <div className={styles.cabecera}>
        <button aria-label="Mes anterior" className={styles.flecha} onClick={() => cambiarMes(-1)} type="button">
          ‹
        </button>
        <strong aria-live="polite" className={styles.titulo}>
          {conMayuscula(tituloDelMes(mesVisible.anio, mesVisible.mes))}
        </strong>
        <button aria-label="Mes siguiente" className={styles.flecha} onClick={() => cambiarMes(1)} type="button">
          ›
        </button>
      </div>

      <table className={styles.mes} onKeyDown={alTeclear} role="grid">
        <thead>
          <tr>
            {INICIALES_SEMANA.map((inicial, posicion) => (
              <th abbr={NOMBRES_SEMANA[posicion]} key={posicion} scope="col">
                {inicial}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana) => (
            <tr key={semana[0].fecha}>
              {semana.map((dia) => {
                const cantidad = marcas?.[dia.fecha] ?? 0;
                const elegible = diaElegible(dia.fecha, minimo, maximo);
                const elegido = dia.fecha === valor;
                const descripcion = [
                  fechaParaLeer(dia.fecha, hoy),
                  dia.fecha === hoy ? "hoy" : null,
                  cantidad > 0 ? `${cantidad} ${cantidad === 1 ? "turno" : "turnos"}` : null,
                ]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <td key={dia.fecha}>
                    <button
                      aria-current={dia.fecha === hoy ? "date" : undefined}
                      aria-label={descripcion}
                      aria-pressed={elegido}
                      className={styles.dia}
                      data-calendario-dia={dia.fecha}
                      data-del-mes={dia.delMes ? "si" : "no"}
                      data-elegido={elegido ? "si" : undefined}
                      data-hoy={dia.fecha === hoy ? "si" : undefined}
                      disabled={!elegible}
                      onClick={() => {
                        setEnfocado(dia.fecha);
                        alElegir(dia.fecha);
                      }}
                      tabIndex={dia.fecha === enfocado ? 0 : -1}
                      type="button"
                    >
                      <span>{dia.numero}</span>
                      {cantidad > 0 ? <small className={styles.marca}>{cantidad}</small> : null}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {diaElegible(hoy, minimo, maximo) ? (
        <button
          className={styles.irAHoy}
          onClick={() => {
            moverFoco(hoy);
            alElegir(hoy);
          }}
          type="button"
        >
          Hoy
        </button>
      ) : null}
    </div>
  );
}
