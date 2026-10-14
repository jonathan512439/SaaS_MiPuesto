"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/* Una fila de opciones que se desplaza de costado, con flechas.
 *
 * Las secciones del panel y las pestañas de la plataforma no entran enteras en
 * un celular —ni, junto al logo y la cuenta, en un escritorio angosto— y se
 * desplazan de costado. Pero sin barra de desplazamiento visible, quien no
 * tiene rueda ni panel táctil, o no sabe que se desplaza, no llegaba a las del
 * final. Pedido por el dueño el 2026-10-13: «un botón de siguiente por si no
 * funciona el mousepad». Cada flecha aparece solo cuando hay algo más de ese
 * lado, y al entrar la fila se mueve sola hasta la opción abierta.
 *
 * Quien la usa pone las clases: la barra de color del panel y el fondo claro
 * de la plataforma no piden las mismas flechas.
 */
type Lados = { antes: boolean; despues: boolean };

export function BarraDesplazable({
  etiqueta,
  clave,
  claseMarco,
  claseBarra,
  claseFlecha,
  children,
}: {
  /* El nombre de la fila para un lector de pantalla: «Secciones del panel». */
  etiqueta: string;
  /* Cambia cuando cambia la opción abierta, para volver a mostrarla. */
  clave?: string;
  claseMarco: string;
  claseBarra: string;
  claseFlecha: string;
  children: ReactNode;
}) {
  const barra = useRef<HTMLElement>(null);
  const [lados, setLados] = useState<Lados>({ antes: false, despues: false });

  const medir = useCallback(() => {
    const elemento = barra.current;
    if (!elemento) return;
    const margen = 4;
    setLados({
      antes: elemento.scrollLeft > margen,
      despues: elemento.scrollLeft + elemento.clientWidth < elemento.scrollWidth - margen,
    });
  }, []);

  useEffect(() => {
    const elemento = barra.current;
    if (!elemento) return;
    /* La opción abierta, a la vista: entrar a la última desde un celular
       dejaba la fila mostrando la primera y la marca de dónde se está, afuera. */
    elemento.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    elemento.addEventListener("scroll", medir, { passive: true });
    return () => {
      observador.disconnect();
      elemento.removeEventListener("scroll", medir);
    };
  }, [medir, clave]);

  function mover(sentido: 1 | -1) {
    const elemento = barra.current;
    if (!elemento) return;
    elemento.scrollBy({ left: sentido * elemento.clientWidth * 0.7, behavior: "smooth" });
  }

  return (
    <div className={claseMarco}>
      {lados.antes ? (
        <button
          aria-label="Ver las opciones anteriores"
          className={claseFlecha}
          data-lado="antes"
          onClick={() => mover(-1)}
          type="button"
        >
          ‹
        </button>
      ) : null}
      <nav aria-label={etiqueta} className={claseBarra} ref={barra}>
        {children}
      </nav>
      {lados.despues ? (
        <button
          aria-label="Ver más opciones"
          className={claseFlecha}
          data-lado="despues"
          onClick={() => mover(1)}
          type="button"
        >
          ›
        </button>
      ) : null}
    </div>
  );
}
