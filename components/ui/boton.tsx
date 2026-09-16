import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import styles from "./ui.module.css";

type VarianteBoton = "principal" | "secundario" | "discreto" | "peligro";

type PropiedadesBoton = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  variante?: VarianteBoton;
  cargando?: boolean;
  anchoCompleto?: boolean;
};

/* «discreto» y «secundario» dibujan lo mismo desde que el panel se quedó con
   tres aspectos en vez de ocho: la diferencia entre los dos no quería decir
   nada, y en la misma tarjeta convivían haciendo creer que sí. Se conservan los
   dos nombres porque marcan intención en quien escribe la pantalla —esta acción
   es la segunda, aquella es la quinta— y porque renombrar ochenta llamadas para
   eso no vale lo que cuesta leer el cambio. */
const clasesPorVariante: Record<VarianteBoton, string> = {
  principal: styles.botonPrincipal,
  secundario: styles.botonSecundario,
  discreto: styles.botonSecundario,
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
