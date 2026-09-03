"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";

import type { PaletaId } from "../../lib/apariencia";
import { calcularSubtotal, formatearPrecioBolivianos } from "../../lib/precios";
import type { DatosPlantilla, ProductoPlantilla } from "../../lib/plantillas/tipos";
import temaStyles from "../templates/tema-catalogo.module.css";
import styles from "./carrito-catalogo.module.css";

type PropiedadesCarrito = {
  datos: DatosPlantilla;
  productos: ProductoPlantilla[];
  cantidades: Record<string, number>;
  paleta: PaletaId;
  onCambiarCantidad: (productoId: string, cantidad: number) => void;
};

type RespuestaPedido = {
  error?: string;
  pedido?: {
    codigo: string;
    total: number;
    expiraEn: string;
    repetido?: boolean;
  };
  enlaceWhatsapp?: string;
};

type PedidoMostrado = NonNullable<RespuestaPedido["pedido"]> & {
  firmaCarrito: string;
  enlaceWhatsapp: string | null;
};

const FORMATEADOR_HORA = new Intl.DateTimeFormat("es-BO", {
  timeZone: "America/La_Paz",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function CarritoCatalogo({
  datos,
  productos,
  cantidades,
  paleta,
  onCambiarCantidad,
}: PropiedadesCarrito) {
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [pedido, setPedido] = useState<PedidoMostrado | null>(null);
  const intento = useRef<{ firma: string; id: string } | null>(null);
  const items = productos
    .map((producto) => ({ producto, cantidad: cantidades[producto.id] ?? 0 }))
    .filter(({ cantidad }) => cantidad > 0);
  const firmaCarrito = items
    .map(({ producto, cantidad }) => `${producto.id}:${cantidad}`)
    .sort()
    .join("|");
  const pedidoVigente = pedido?.firmaCarrito === firmaCarrito ? pedido : null;
  const subtotal = calcularSubtotal(
    items.map(({ producto, cantidad }) => ({ precio: producto.precio, cantidad })),
  );
  const unidades = items.reduce((total, { cantidad }) => total + cantidad, 0);
  const puedeConfirmar =
    items.length > 0 && datos.negocio.atencion.permiteAcciones && Boolean(datos.negocio.slug);

  async function reservarPedido(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!puedeConfirmar || enviando) return;

    setEnviando(true);
    setError("");
    if (!intento.current || intento.current.firma !== firmaCarrito) {
      intento.current = { firma: firmaCarrito, id: crypto.randomUUID() };
    }

    try {
      const respuesta = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: datos.negocio.slug,
          items: items.map(({ producto, cantidad }) => ({
            productoId: producto.id,
            cantidad,
          })),
          clienteNombre,
          clienteTelefono,
          idempotencia: intento.current.id,
        }),
      });
      const contenido = (await respuesta.json().catch(() => ({}))) as RespuestaPedido;

      if (contenido.pedido) {
        setPedido({
          ...contenido.pedido,
          firmaCarrito,
          enlaceWhatsapp: contenido.enlaceWhatsapp ?? null,
        });
      }
      if (!respuesta.ok || !contenido.pedido) {
        throw new Error(contenido.error || "No se pudo reservar el pedido.");
      }
    } catch (motivo) {
      setError(
        motivo instanceof Error
          ? motivo.message
          : "No se pudo reservar el pedido. Intenta nuevamente.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section
      aria-labelledby="titulo-carrito"
      className={`${temaStyles.tema} ${styles.carrito}`}
      data-paleta={paleta}
      id="resumen-pedido"
    >
      <header>
        <div>
          <p>Tu selección</p>
          <h2 id="titulo-carrito">Pedido por WhatsApp</h2>
        </div>
        <strong>{items.length === 1 ? "1 producto" : `${items.length} productos`}</strong>
      </header>

      {items.length === 0 ? (
        <p className={styles.vacio}>
          Todavía no agregaste productos. Elige una opción del catálogo para preparar tu pedido.
        </p>
      ) : (
        <ul aria-live="polite">
          {items.map(({ producto, cantidad }) => (
            <li key={producto.id}>
              {producto.imagen ? (
                <Image
                  alt={producto.imagen.alt}
                  className={styles.miniatura}
                  height={192}
                  sizes="48px"
                  src={producto.imagen.src}
                  width={192}
                />
              ) : (
                <span aria-hidden="true" className={styles.sinMiniatura}>
                  Sin foto
                </span>
              )}
              <div className={styles.detalle}>
                <strong>{producto.nombre}</strong>
                <span>{formatearPrecioBolivianos(producto.precio)} cada uno</span>
              </div>
              <div className={styles.cantidad} aria-label={`Cantidad de ${producto.nombre}`}>
                <button
                  aria-label={`Disminuir cantidad de ${producto.nombre}`}
                  onClick={() => onCambiarCantidad(producto.id, cantidad - 1)}
                  type="button"
                >
                  −
                </button>
                <span>{cantidad}</span>
                <button
                  aria-label={`Aumentar cantidad de ${producto.nombre}`}
                  disabled={cantidad >= producto.maximoCantidad}
                  onClick={() => onCambiarCantidad(producto.id, cantidad + 1)}
                  type="button"
                >
                  +
                </button>
              </div>
              <strong className={styles.totalItem}>
                {formatearPrecioBolivianos(
                  calcularSubtotal([{ precio: producto.precio, cantidad }]),
                )}
              </strong>
              <button
                className={styles.quitar}
                onClick={() => onCambiarCantidad(producto.id, 0)}
                type="button"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.resumen}>
        <span>Subtotal estimado</span>
        <strong>{formatearPrecioBolivianos(subtotal)}</strong>
        <small>
          {unidades === 1 ? "1 unidad" : `${unidades} unidades`} en{" "}
          {items.length === 1 ? "1 producto" : `${items.length} productos`}. El envío o
          los extras se acuerdan por WhatsApp.
        </small>
      </div>

      {items.length > 0 ? (
        <form className={styles.confirmacion} onSubmit={reservarPedido}>
          <div className={styles.introduccion}>
            <h3>Reserva antes de escribir</h3>
            <p>
              Verificaremos precios y existencias. Después recibirás un código para continuar por WhatsApp.
            </p>
          </div>
          <div className={styles.campos}>
            <label htmlFor="pedido-cliente-nombre">
              Nombre <span>Opcional</span>
            </label>
            <input
              autoComplete="name"
              id="pedido-cliente-nombre"
              maxLength={80}
              onChange={(evento) => setClienteNombre(evento.target.value)}
              placeholder="Ej.: Ana Pérez"
              value={clienteNombre}
            />
            <label htmlFor="pedido-cliente-telefono">
              Tu celular <span>Opcional</span>
            </label>
            <input
              autoComplete="tel"
              id="pedido-cliente-telefono"
              inputMode="tel"
              maxLength={20}
              onChange={(evento) => setClienteTelefono(evento.target.value)}
              placeholder="Ej.: 71234567"
              type="tel"
              value={clienteTelefono}
            />
          </div>

          {datos.negocio.qrPagoUrl ? (
            <figure className={styles.qr}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={`QR de cobro de ${datos.negocio.nombre}`} src={datos.negocio.qrPagoUrl} />
              <figcaption>
                QR de cobro del negocio. La reserva no confirma que el pago haya sido recibido.
              </figcaption>
            </figure>
          ) : null}

          <button disabled={!puedeConfirmar || enviando} type="submit">
            {enviando ? "Verificando pedido…" : "Reservar pedido"}
          </button>
        </form>
      ) : null}

      <div aria-live="polite" className={styles.resultado}>
        {error ? <p className={styles.error}>{error}</p> : null}
        {pedidoVigente ? (
          <div className={styles.exito}>
            <h3>Reserva {pedidoVigente.codigo} creada</h3>
            <p>
              Total verificado: {formatearPrecioBolivianos(pedidoVigente.total)}. Se mantiene hasta el{" "}
              {FORMATEADOR_HORA.format(new Date(pedidoVigente.expiraEn))}.
            </p>
            {pedidoVigente.enlaceWhatsapp ? (
              <a href={pedidoVigente.enlaceWhatsapp} rel="noreferrer" target="_blank">
                Continuar por WhatsApp
              </a>
            ) : (
              <p>Guarda el código y comunícate con el negocio por otro medio.</p>
            )}
          </div>
        ) : null}
      </div>

      {items.length > 0 && !datos.negocio.atencion.permiteAcciones ? (
        <p className={styles.restriccion}>
          Podrás reservar este pedido cuando el negocio vuelva a su horario de atención.
        </p>
      ) : null}
    </section>
  );
}
