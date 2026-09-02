import type { ProductoPlantilla } from "../../lib/plantillas/tipos";

type PropiedadesAccionProducto = {
  producto: ProductoPlantilla;
  modalidad: "solo_lectura" | "accion_individual" | "carrito";
  permiteAcciones: boolean;
  demostracion: boolean;
  cantidad?: number;
  alAgregarProducto?: (productoId: string) => void;
};

export function AccionProducto({
  producto,
  modalidad,
  permiteAcciones,
  demostracion,
  cantidad = 0,
  alAgregarProducto,
}: PropiedadesAccionProducto) {
  if (modalidad === "solo_lectura") return null;

  const agotado = producto.estado === "agotado";
  if (modalidad === "accion_individual") {
    const etiqueta = "Pedir o agendar por WhatsApp";
    if (demostracion || !producto.accionWhatsapp || !permiteAcciones || agotado) {
      return (
        <button disabled={!demostracion || agotado} type="button">
          {etiqueta}
        </button>
      );
    }

    return (
      <a
        aria-label={`${etiqueta}: ${producto.nombre}`}
        href={producto.accionWhatsapp}
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
      disabled={agotado || (!demostracion && !alAgregarProducto)}
      onClick={() => alAgregarProducto?.(producto.id)}
      type="button"
    >
      {cantidad > 0 ? `Agregar otro · ${cantidad} en el pedido` : "Agregar al pedido"}
    </button>
  );
}
