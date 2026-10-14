"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Icono, type NombreIcono } from "../iconos/icono";
import styles from "../../app/(admin)/dashboard/dashboard.module.css";
import { RUTAS_PANEL } from "../../lib/panel/rutas";

/* El ícono acompaña a la palabra, no la reemplaza. Con nueve secciones que se
   recorren de reojo, la forma se reconoce antes que el texto y se vuelve a la
   sección de siempre sin leer; sin la palabra al lado, en cambio, habría que
   aprenderse nueve dibujos. */
const ENLACES: ReadonlyArray<{ href: string; etiqueta: string; icono: NombreIcono }> = [
  /* «Resumen» y no «Inicio», decidido con el dueño. «Inicio» dice dónde está la
     pantalla; «Resumen» dice qué hay adentro, que es lo que sirve para elegir
     entre nueve secciones. */
  { href: RUTAS_PANEL.inicio, etiqueta: "Resumen", icono: "casa" },
  /* «Mi negocio» y «Mi catálogo» con el posesivo, y no «Negocio» y «Catálogo» a
     secas: son las dos pantallas que un dueño nuevo confunde con las de la
     plataforma, y el «mi» es lo que le dice de quién es lo que está tocando. */
  { href: RUTAS_PANEL.negocio, etiqueta: "Mi negocio", icono: "tienda" },
  /* «Mi catálogo» son las secciones y «Productos» lo que va adentro. Van
     pegadas y en ese orden porque así se recorre el trabajo: primero se arma la
     sección, después se llena. */
  { href: RUTAS_PANEL.catalogo, etiqueta: "Mi catálogo", icono: "carpeta" },
  { href: RUTAS_PANEL.productos, etiqueta: "Productos", icono: "caja" },
  /* «Apariencia» y no «Diseño»: diseñar es una tarea, y acá no se diseña nada
     —se elige entre cosas ya hechas—. La palabra prometía más de lo que hay. */
  { href: RUTAS_PANEL.apariencia, etiqueta: "Apariencia", icono: "paleta" },
  { href: RUTAS_PANEL.promociones, etiqueta: "Promociones", icono: "etiqueta" },
  { href: RUTAS_PANEL.pedidos, etiqueta: "Pedidos y citas", icono: "calendario" },
  /* Anteúltima y no arriba: son las que se usan de vez en cuando. El orden de la
     barra es el de la frecuencia con que se entra, no el de la importancia. */
  { href: RUTAS_PANEL.herramientas, etiqueta: "Herramientas", icono: "grafico" },
  { href: RUTAS_PANEL.cuenta, etiqueta: "Cuenta", icono: "persona" },
];


/* Las flechas de la barra.
 *
 * Con nueve secciones, la barra no entra entera en un celular ni, junto al logo
 * y la cuenta, en un escritorio angosto: se desplaza de costado. Pero sin
 * barra de desplazamiento visible, quien no tiene rueda ni panel táctil —o no
 * sabe que se desplaza— no llegaba a las del final. Pedido por el dueño el
 * 2026-10-13: «un botón de siguiente por si no funciona el mousepad». Cada
 * flecha aparece solo cuando hay algo más de ese lado. */
type Lados = { antes: boolean; despues: boolean };

export function NavegacionDashboard() {
  const rutaActual = usePathname();
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
    /* La sección abierta, a la vista: entrar a «Cuenta» desde un celular
       dejaba la barra mostrando «Resumen» y la marca de dónde se está, afuera. */
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
  }, [medir, rutaActual]);

  function mover(sentido: 1 | -1) {
    const elemento = barra.current;
    if (!elemento) return;
    elemento.scrollBy({ left: sentido * elemento.clientWidth * 0.7, behavior: "smooth" });
  }

  return (
    <div className={styles.navegacionMarco}>
      {lados.antes ? (
        <button
          aria-label="Ver las secciones anteriores"
          className={styles.flechaNavegacion}
          data-lado="antes"
          onClick={() => mover(-1)}
          type="button"
        >
          ‹
        </button>
      ) : null}
      <nav aria-label="Secciones del panel" className={styles.navegacion} ref={barra}>
        {ENLACES.map(({ etiqueta, href, icono }) => {
          const activo = rutaActual === href;

          return (
            <Link
              aria-current={activo ? "page" : undefined}
              className={activo ? styles.enlaceActivo : styles.enlace}
              href={href}
              key={href}
            >
              <Icono className={styles.iconoEnlace} nombre={icono} />
              {etiqueta}
            </Link>
          );
        })}
      </nav>
      {lados.despues ? (
        <button
          aria-label="Ver más secciones"
          className={styles.flechaNavegacion}
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
