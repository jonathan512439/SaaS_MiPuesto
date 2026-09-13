"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icono, type NombreIcono } from "../iconos/icono";
import styles from "../../app/(admin)/dashboard/dashboard.module.css";

/* El ícono acompaña a la palabra, no la reemplaza. Con ocho secciones que se
   recorren de reojo, la forma se reconoce antes que el texto y se vuelve a la
   sección de siempre sin leer; sin la palabra al lado, en cambio, habría que
   aprenderse ocho dibujos. */
const ENLACES: ReadonlyArray<{ href: string; etiqueta: string; icono: NombreIcono }> = [
  { href: "/dashboard", etiqueta: "Resumen", icono: "casa" },
  { href: "/dashboard/configuracion", etiqueta: "Negocio", icono: "tienda" },
  { href: "/dashboard/plantilla", etiqueta: "Diseño", icono: "paleta" },
  { href: "/dashboard/catalogo", etiqueta: "Catálogo", icono: "caja" },
  { href: "/dashboard/promociones", etiqueta: "Promociones", icono: "etiqueta" },
  { href: "/dashboard/pedidos", etiqueta: "Pedidos", icono: "documento" },
  { href: "/dashboard/agenda", etiqueta: "Agenda", icono: "calendario" },
  { href: "/dashboard/cuenta", etiqueta: "Cuenta", icono: "persona" },
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
