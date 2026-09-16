"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icono, type NombreIcono } from "../iconos/icono";
import styles from "../../app/(admin)/dashboard/dashboard.module.css";
import { RUTAS_PANEL } from "../../lib/panel/rutas";

/* El ícono acompaña a la palabra, no la reemplaza. Con ocho secciones que se
   recorren de reojo, la forma se reconoce antes que el texto y se vuelve a la
   sección de siempre sin leer; sin la palabra al lado, en cambio, habría que
   aprenderse ocho dibujos. */
const ENLACES: ReadonlyArray<{ href: string; etiqueta: string; icono: NombreIcono }> = [
  { href: RUTAS_PANEL.inicio, etiqueta: "Inicio", icono: "casa" },
  /* «Mi negocio» y «Mi catálogo» con el posesivo, y no «Negocio» y «Catálogo» a
     secas: son las dos pantallas que un dueño nuevo confunde con las de la
     plataforma, y el «mi» es lo que le dice de quién es lo que está tocando. */
  { href: RUTAS_PANEL.negocio, etiqueta: "Mi negocio", icono: "tienda" },
  { href: RUTAS_PANEL.catalogo, etiqueta: "Mi catálogo", icono: "caja" },
  /* «Apariencia» y no «Diseño»: diseñar es una tarea, y acá no se diseña nada
     —se elige entre cosas ya hechas—. La palabra prometía más de lo que hay. */
  { href: RUTAS_PANEL.apariencia, etiqueta: "Apariencia", icono: "paleta" },
  { href: RUTAS_PANEL.promociones, etiqueta: "Promociones", icono: "etiqueta" },
  { href: RUTAS_PANEL.pedidos, etiqueta: "Pedidos", icono: "documento" },
  { href: RUTAS_PANEL.agenda, etiqueta: "Agenda", icono: "calendario" },
  { href: RUTAS_PANEL.cuenta, etiqueta: "Cuenta", icono: "persona" },
];


export function NavegacionDashboard() {
  const rutaActual = usePathname();

  return (
    <nav aria-label="Secciones del panel" className={styles.navegacion}>
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
  );
}
