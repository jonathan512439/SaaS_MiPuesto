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
  return <Icono nombre={producto.vendeTiempo ? "calendario" : "carrito"} />;
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
  /* Con ícono en la tarjeta y con palabras en la ficha.

     No es una preferencia: es el sitio disponible. En la tarjeta, al lado del
     precio, una frase se parte en tres renglones y hace la tarjeta más alta que
     el producto; en la ficha hay una pantalla entera y el botón es lo único que
     se toca, así que decir qué hace cuesta nada y ahorra una duda.

     La forma corta vino después, y por eso la larga es la de omisión: una
     pantalla nueva que se olvide de elegir sale con palabras, que es lo que no
     se entiende mal. */
  presentacion?: "icono" | "completa";
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
  presentacion = "completa",
}: PropiedadesAccionProducto) {
  const soloIcono = presentacion === "icono";
  /* Un catálogo de solo mostrar no vende, pero sus productos **se miran**: la
     ficha tiene todas las fotografías, la descripción entera y los datos de su
     categoría, y hasta ahora la única forma de llegar era tocar la fotografía,
     que no se ve que se pueda tocar.

     Así que la tarjeta lleva un ojo en el mismo lugar donde las otras
     modalidades llevan el carrito. Adentro de la ficha no: ahí ya se está
     mirando, y un botón que no hace nada es peor que ninguno. */
  if (modalidad === "solo_lectura") {
    if (!soloIcono) return null;
    return (
      <button
        aria-label={`Ver ${producto.nombre}`}
        onClick={() => alVerProducto?.(producto.id)}
        type="button"
      >
        <Icono nombre="ojo" />
      </button>
    );
  }

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
        {soloIcono ? null : <span>Agendar</span>}
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
          {soloIcono ? null : <span>{etiqueta}</span>}
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
        {soloIcono ? null : <span>{etiqueta}</span>}
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
      {soloIcono ? null : (
        <span>
          {sinCantidad
            ? `Máximo disponible (${cantidad})`
            : cantidad > 0
              ? `Agregar otro (${cantidad} en el pedido)`
              : "Agregar al pedido"}
        </span>
      )}
      {/* Cuántos lleva ya, sobre la esquina. Solo con el ícono solo: con
          palabras el número ya está escrito, y repetirlo sería decirlo dos
          veces. */}
      {soloIcono && cantidad > 0 ? <b aria-hidden="true">{cantidad}</b> : null}
    </button>
  );
}
