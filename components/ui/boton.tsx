import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./ui.module.css";

type VarianteBoton = "principal" | "secundario" | "discreto" | "peligro";

type PropiedadesBoton = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variante?: VarianteBoton;
  cargando?: boolean;
  anchoCompleto?: boolean;
};

const clasesPorVariante: Record<VarianteBoton, string> = {
  principal: styles.botonPrincipal,
  secundario: styles.botonSecundario,
  discreto: styles.botonDiscreto,
  peligro: styles.botonPeligro,
};

export function Boton({
  children,
  variante = "principal",
  cargando = false,
  anchoCompleto = false,
  className,
  disabled,
  type = "button",
  ...propiedades
}: PropiedadesBoton) {
  const clases = [
    styles.boton,
    clasesPorVariante[variante],
    anchoCompleto ? styles.anchoCompleto : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...propiedades}
      aria-busy={cargando || undefined}
      className={clases}
      disabled={disabled || cargando}
      type={type}
    >
      {cargando ? <span aria-hidden="true" className={styles.cargador} /> : null}
      <span>{children}</span>
    </button>
  );
}
