"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "../../app/(admin)/dashboard/dashboard.module.css";

const ENLACES = [
  { href: "/dashboard/configuracion", etiqueta: "Negocio" },
  { href: "/dashboard/plantilla", etiqueta: "Diseño" },
  { href: "/dashboard/catalogo", etiqueta: "Catálogo" },
  { href: "/dashboard/promociones", etiqueta: "Promociones" },
  { href: "/dashboard/pedidos", etiqueta: "Pedidos" },
] as const;

export function NavegacionDashboard() {
  const rutaActual = usePathname();

  return (
    <nav aria-label="Secciones del panel" className={styles.navegacion}>
      {ENLACES.map(({ etiqueta, href }) => {
        const activo = rutaActual === href;

        return (
          <Link
            aria-current={activo ? "page" : undefined}
            className={activo ? styles.enlaceActivo : styles.enlace}
            href={href}
            key={href}
          >
            {etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
