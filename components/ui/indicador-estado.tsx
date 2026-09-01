import styles from "./ui.module.css";

export type EstadoProducto = "disponible" | "reservado" | "vendido" | "oculto";

const configuracion: Record<
  EstadoProducto,
  { etiqueta: string; simbolo: string; clase: string }
> = {
  disponible: {
    etiqueta: "Disponible",
    simbolo: "✓",
    clase: styles.estadoDisponible,
  },
  reservado: {
    etiqueta: "Reservado",
    simbolo: "!",
    clase: styles.estadoReservado,
  },
  vendido: {
    etiqueta: "Vendido",
    simbolo: "×",
    clase: styles.estadoVendido,
  },
  oculto: {
    etiqueta: "Oculto",
    simbolo: "—",
    clase: styles.estadoOculto,
  },
};

export function IndicadorEstado({ estado }: { estado: EstadoProducto }) {
  const { etiqueta, simbolo, clase } = configuracion[estado];

  return (
    <span className={[styles.indicadorEstado, clase].join(" ")}>
      <span aria-hidden="true" className={styles.simboloEstado}>
        {simbolo}
      </span>
      {etiqueta}
    </span>
  );
}
