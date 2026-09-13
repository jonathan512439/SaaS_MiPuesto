import type { ProductoPlantilla } from "../../lib/plantillas/tipos";

type PropiedadesAccionProducto = {
  producto: ProductoPlantilla;
  modalidad: "solo_lectura" | "accion_individual" | "carrito";
  permiteAcciones: boolean;
  demostracion: boolean;
  cantidad?: number;
  alAgregarProducto?: (productoId: string) => void;
  alAbrirWhatsapp?: (productoId: string | null) => void;
  /* Para los servicios: la acción es abrir la ficha, que es donde vive el
     calendario. Las tarjetas ya reciben esta función para la foto. */
  alVerProducto?: (productoId: string) => void;
};

export function AccionProducto({
  producto,
  modalidad,
  permiteAcciones,
  demostracion,
  cantidad = 0,
  alAgregarProducto,
  alAbrirWhatsapp,
  alVerProducto,
}: PropiedadesAccionProducto) {
  if (modalidad === "solo_lectura") return null;

  /* Un servicio no se agrega al carrito: se agenda. La tarjeta lleva a la ficha,
     que es donde está el calendario, en vez de meter «1 consulta» en el carrito
     sin día ni hora.

     Dice solo «Agendar», sin adelantar el próximo horario: el dueño lo pidió
     así, y la disponibilidad se mira adentro, donde están todos los días. */
  if (producto.vendeTiempo) {
    return (
      <button
        aria-label={`Agendar ${producto.nombre}`}
        disabled={demostracion}
        onClick={() => alVerProducto?.(producto.id)}
        type="button"
      >
        Agendar
      </button>
    );
  }

  const noDisponible = producto.estado !== undefined && producto.estado !== "disponible";
  const sinCantidad = modalidad === "carrito" && cantidad >= producto.maximoCantidad;
  if (modalidad === "accion_individual") {
    const etiqueta = "Pedir o agendar por WhatsApp";
    if (demostracion || !producto.accionWhatsapp || !permiteAcciones || noDisponible) {
      return (
        <button disabled={!demostracion || noDisponible} type="button">
          {etiqueta}
        </button>
      );
    }

    return (
      <a
        aria-label={`${etiqueta}: ${producto.nombre}`}
        href={producto.accionWhatsapp}
        onClick={() => alAbrirWhatsapp?.(producto.id)}
        rel="noreferrer"
        target="_blank"
      >
        {etiqueta}
      </a>
    );
  }

  return (
    <button
      aria-label={`Agregar ${producto.nombre} al pedido`}
      disabled={noDisponible || sinCantidad || (!demostracion && !alAgregarProducto)}
      onClick={() => alAgregarProducto?.(producto.id)}
      type="button"
    >
      {sinCantidad
        ? `Máximo disponible (${cantidad})`
        : cantidad > 0
          ? `Agregar otro (${cantidad} en el pedido)`
          : "Agregar al pedido"}
    </button>
  );
}
