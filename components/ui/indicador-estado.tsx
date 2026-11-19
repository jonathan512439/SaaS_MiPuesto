import styles from "./ui.module.css";

/* Los cuatro primeros son los valores de productos.estado en la base; "oculto"
   es el otro eje, productos.visible, y se muestra con la misma forma porque el
   dueno los lee de un vistazo como un solo semaforo. "sin_precio" es un tercer
   eje (fase 14), con la misma forma por lo mismo. Solo en el panel: el catálogo
   nunca dice que un producto no tiene precio. */
export type EstadoProducto =
  | "disponible"
  | "reservado"
  | "vendido"
  | "agotado"
  | "oculto"
  | "sin_precio";

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
  agotado: {
    etiqueta: "Agotado",
    simbolo: "0",
    clase: styles.estadoAgotado,
  },
  oculto: {
    etiqueta: "Oculto",
    simbolo: "—",
    clase: styles.estadoOculto,
  },
  sin_precio: {
    etiqueta: "Sin precio",
    simbolo: "?",
    clase: styles.estadoSinPrecio,
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
