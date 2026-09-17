import { Icono } from "../iconos/icono";
import type { ProductoPlantilla } from "../../lib/plantillas/tipos";

/* La acción de la tarjeta es un ícono y no una frase.
 *
 * Las frases eran «Agregar al pedido», «Agendar», «Pedir o agendar por
 * WhatsApp». Al lado del precio, en una tarjeta que en un teléfono mide media
 * pantalla, cada una ocupaba dos o tres renglones y empujaba la tarjeta hacia
 * abajo: con seis productos en pantalla, eso son doce renglones de texto que
 * dicen lo mismo seis veces.
 *
 * El ícono es el mismo que usan los catálogos que el dueño ya conoce como
 * cliente: una bolsa para comprar, un calendario para reservar. Lo que se pierde
 * —la palabra— se recupera en dos lugares: el `aria-label` lo dice entero para
 * quien no ve el dibujo, y la cuenta de lo que ya está en el pedido va como
 * número encima, que es más claro que «Agregar otro (2 en el pedido)».
 *
 * Bolsa o calendario lo decide el producto y no la pantalla: `vendeTiempo` ya
 * viene resuelto desde el servidor, porque es su categoría la que lo sabe. */
function IconoDeAccion({ producto }: { producto: ProductoPlantilla }) {
  return <Icono nombre={producto.vendeTiempo ? "calendario" : "bolsa"} />;
}

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
        <IconoDeAccion producto={producto} />
      </button>
    );
  }

  const noDisponible = producto.estado !== undefined && producto.estado !== "disponible";
  const sinCantidad = modalidad === "carrito" && cantidad >= producto.maximoCantidad;
  if (modalidad === "accion_individual") {
    const etiqueta = "Pedir o agendar por WhatsApp";
    if (demostracion || !producto.accionWhatsapp || !permiteAcciones || noDisponible) {
      return (
        <button aria-label={etiqueta} disabled={!demostracion || noDisponible} type="button">
          <IconoDeAccion producto={producto} />
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
        <IconoDeAccion producto={producto} />
      </a>
    );
  }

  return (
    <button
      /* El rótulo entero sigue existiendo para quien no ve el dibujo, y cambia
         con el estado: sin él, un botón apagado no diría por qué. */
      aria-label={
        sinCantidad
          ? `${producto.nombre}: ya agregaste el máximo disponible (${cantidad})`
          : cantidad > 0
            ? `Agregar otro ${producto.nombre} al pedido (${cantidad} ya agregados)`
            : `Agregar ${producto.nombre} al pedido`
      }
      disabled={noDisponible || sinCantidad || (!demostracion && !alAgregarProducto)}
      onClick={() => alAgregarProducto?.(producto.id)}
      type="button"
    >
      <IconoDeAccion producto={producto} />
      {/* Cuántos lleva ya. Encima del ícono y no como palabras al lado: es el
          mismo lugar donde lo pone el carrito de la cabecera, así que se lee sin
          aprender nada nuevo. */}
      {cantidad > 0 ? <b aria-hidden="true">{cantidad}</b> : null}
    </button>
  );
}
