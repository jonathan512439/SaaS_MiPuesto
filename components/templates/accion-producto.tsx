import Link from "next/link";

import { Icono } from "../iconos/icono";
import type { ProductoPlantilla } from "../../lib/plantillas/tipos";
import { TEXTOS_DE_PRESENTACION } from "../../lib/catalogo/variantes";

/* La acción de la tarjeta es un ícono y no una frase.
 *
 * Las frases eran «Agregar al pedido», «Agendar», «Pedir o agendar por
 * WhatsApp». Al lado del precio, en una tarjeta que en un teléfono mide media
 * pantalla, cada una ocupaba dos o tres renglones y empujaba la tarjeta hacia
 * abajo: con seis productos en pantalla, eso son doce renglones de texto que
 * dicen lo mismo seis veces.
 *
 * El ícono es el mismo que usan los catálogos que el dueño ya conoce como
 * cliente: un carrito para comprar, un calendario para reservar. Lo que se
 * pierde —la palabra— se recupera en dos lugares: el `aria-label` lo dice entero
 * para quien no ve el dibujo, y la cuenta de lo que ya está en el pedido va como
 * número encima, que es más claro que «Agregar otro (2 en el pedido)».
 *
 * Carrito o calendario lo decide el producto y no la pantalla: `vendeTiempo` ya
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
  /* La página del producto. Es la acción de las tarjetas que no venden desde el
     catálogo: un servicio se agenda ahí —es donde vive el calendario— y un
     catálogo de solo mostrar se mira ahí.

     En `null` no hay adónde ir: las vistas previas del panel y de la portada. */
  href?: string | null;
  /* Se avisa al tocar, para la analítica del negocio. */
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
  href,
  alVerProducto,
  presentacion = "completa",
}: PropiedadesAccionProducto) {
  const soloIcono = presentacion === "icono";

  /* Un catálogo de solo mostrar no vende, pero sus productos **se miran**: la
     página del producto tiene todas las fotografías, la descripción entera y los
     datos de su categoría, y hasta que apareció este ojo la única forma de
     llegar era tocar la fotografía, que no se ve que se pueda tocar.

     Así que la tarjeta lleva un ojo en el mismo lugar donde las otras
     modalidades llevan el carrito. Adentro de la página no: ahí ya se está
     mirando, y un botón que no hace nada es peor que ninguno. */
  if (modalidad === "solo_lectura") {
    if (!soloIcono || !href) return null;
    return (
      <Link
        aria-label={`Ver ${producto.nombre}`}
        href={href}
        onClick={() => alVerProducto?.(producto.id)}
      >
        <Icono nombre="ojo" />
      </Link>
    );
  }

  /* Un servicio no se agrega al carrito: se agenda. La tarjeta lleva a la página
     del producto, que es donde está el calendario, en vez de meter «1 consulta»
     en el carrito sin día ni hora.

     Dice solo «Agendar», sin adelantar el próximo horario: el dueño lo pidió
     así, y la disponibilidad se mira adentro, donde están todos los días. */
  if (producto.vendeTiempo) {
    if (!href) {
      return (
        <button aria-label={`Agendar ${producto.nombre}`} disabled type="button">
          <IconoDeAccion producto={producto} />
          {soloIcono ? null : <span>Agendar</span>}
        </button>
      );
    }

    return (
      <Link
        aria-label={`Agendar ${producto.nombre}`}
        href={href}
        onClick={() => alVerProducto?.(producto.id)}
      >
        <IconoDeAccion producto={producto} />
        {soloIcono ? null : <span>Agendar</span>}
      </Link>
    );
  }

  /* Con presentaciones, primero hay que elegir la talla, el número o el tamaño,
     y eso se hace en la página del producto. La tarjeta lleva ahí en vez de
     agregar el producto sin presentación, que es justamente lo que la fase 13
     vino a impedir: un pedido que no dice qué talla. */
  if (producto.variantes.length > 0) {
    const textos = TEXTOS_DE_PRESENTACION[producto.tipoPresentacion ?? "presentacion"];
    const etiqueta = `${textos.boton} de ${producto.nombre}`;
    if (!href) {
      return (
        <button aria-label={etiqueta} disabled type="button">
          <Icono nombre="etiqueta" />
          {soloIcono ? null : <span>{textos.boton}</span>}
        </button>
      );
    }
    return (
      <Link aria-label={etiqueta} href={href} onClick={() => alVerProducto?.(producto.id)}>
        <Icono nombre="etiqueta" />
        {soloIcono ? null : <span>{textos.boton}</span>}
      </Link>
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
