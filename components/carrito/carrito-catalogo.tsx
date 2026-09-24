"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { construirFirmaCarrito } from "../../lib/pedidos/firma";
import { useVerificacionHumana } from "../../lib/turnstile-cliente";
import { MENSAJE_SIN_RESPUESTA, enviarConReintento } from "../../lib/pedidos/enviar-con-reintento";
import { itemDeRenglon } from "../../lib/pedidos/linea";
import { resumenSigueVigente } from "../../lib/pedidos/resumen-vigente";
import { avisoDeTopeUnidades } from "../../lib/pedidos/tope-unidades";
import { calcularSubtotal, formatearPrecioBolivianos } from "../../lib/precios";
import type { DatosPlantilla, ProductoPlantilla } from "../../lib/plantillas/tipos";
import { Icono } from "../iconos/icono";
import styles from "./carrito-catalogo.module.css";

type PropiedadesCarrito = {
  datos: DatosPlantilla;
  productos: ProductoPlantilla[];
  cantidades: Record<string, number>;
  onCambiarCantidad: (productoId: string, cantidad: number) => void;
  onAbrirWhatsapp: () => void;
  onPedidoReservado: (firmaCarrito: string) => void;
  /* Si la hoja del pedido está a la vista. Con ella abierta y algo para
     pedir, la verificación empieza de antemano. */
  abierto?: boolean;
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
  onCambiarCantidad,
  onAbrirWhatsapp,
  onPedidoReservado,
  abierto = false,
}: PropiedadesCarrito) {
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [numeroMesa, setNumeroMesa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [descargandoQr, setDescargandoQr] = useState(false);
  const [error, setError] = useState("");
  const [errorDescarga, setErrorDescarga] = useState("");
  const [pedido, setPedido] = useState<PedidoMostrado | null>(null);
  /* Se marca cuando el comprador ya se fue a WhatsApp con su código. A partir de
     ahí el carrito se vacía —lo que había adentro ya es un pedido— pero el
     resumen con el código tiene que seguir a la vista: es el único lugar donde
     está el número de la reserva. */
  const [entregado, setEntregado] = useState(false);
  const [qrDescargado, setQrDescargado] = useState(false);
  const intento = useRef<{ firma: string; id: string } | null>(null);
  /* Que el pedido lo haga una persona: sin esto, un programa que cambia de IP
     podía apartar todo el stock sin comprar nada. */
  const {
    contenedor: contenedorVerificacion,
    obtenerToken,
    preparar: prepararVerificacion,
  } = useVerificacionHumana();
  const items = productos
    .map((producto) => ({ producto, cantidad: cantidades[producto.id] ?? 0 }))
    .filter(({ cantidad }) => cantidad > 0);
  const firmaCarrito = construirFirmaCarrito(cantidades);
  /* La decisión vive en `resumen-vigente.ts`: son tres estados que parecen dos
     —carrito vacío porque no eligió nada, y carrito vacío porque ya pidió— y
     confundirlos es exactamente lo que hacía desaparecer el código de la
     reserva. Acá se consulta; allá se prueba. */
  const pedidoVigente = resumenSigueVigente({
    entregado,
    firmaCarrito,
    firmaPedido: pedido?.firmaCarrito ?? null,
    hayItems: items.length > 0,
  })
    ? pedido
    : null;
  const subtotal = calcularSubtotal(
    items.map(({ producto, cantidad }) => ({ precio: producto.precio, cantidad })),
  );
  const unidades = items.reduce((total, { cantidad }) => total + cantidad, 0);
  /* El tope de unidades del dueño, avisado antes de enviar. Quien decide es la
     base; esto evita que el comprador se entere con un error. */
  const topeUnidades = datos.negocio.topeUnidadesPedido;
  const avisoTope = avisoDeTopeUnidades(unidades, topeUnidades);
  const puedeConfirmar =
    items.length > 0 &&
    !avisoTope &&
    datos.negocio.atencion.permiteAcciones &&
    Boolean(datos.negocio.slug);

  /* La verificación empieza al abrir el pedido, no al tocar «Reservar»: así el
     token suele estar listo al enviar. Solo con algo para pedir, y no con un
     pedido ya reservado a la vista. Quien solo mira el catálogo no descarga
     nada de Cloudflare. */
  const hayReservaALaVista = pedidoVigente !== null;
  useEffect(() => {
    if (abierto && puedeConfirmar && !hayReservaALaVista) prepararVerificacion();
  }, [abierto, puedeConfirmar, hayReservaALaVista, prepararVerificacion]);

  async function reservarPedido(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!puedeConfirmar || enviando) return;

    setEnviando(true);
    setError("");
    if (!intento.current || intento.current.firma !== firmaCarrito) {
      intento.current = { firma: firmaCarrito, id: crypto.randomUUID() };
    }

    const idempotencia = intento.current.id;
    try {
      /* Ante un corte se pregunta de nuevo con el mismo identificador: si el
         pedido ya se había creado, vuelve ese mismo y no se duplica. Cada
         intento pide un token de verificación nuevo, porque sirven una vez.
         `lib/pedidos/enviar-con-reintento.ts` cuenta por qué. */
      const resultado = await enviarConReintento<RespuestaPedido>(async () =>
        fetch("/api/pedidos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: datos.negocio.slug,
            /* Un renglón de una presentación manda el producto y la presentación
               por separado; el precio no viaja nunca, lo pone la base. */
            items: items.map(({ producto, cantidad }) => itemDeRenglon(producto, cantidad)),
            clienteNombre,
            clienteTelefono,
            numeroMesa,
            idempotencia,
            verificacion: await obtenerToken(),
          }),
        }),
      );

      if (resultado.tipo === "sin_respuesta") {
        setError(MENSAJE_SIN_RESPUESTA);
        return;
      }

      const contenido = resultado.datos;
      if (contenido.pedido) {
        setPedido({
          ...contenido.pedido,
          firmaCarrito,
          enlaceWhatsapp: contenido.enlaceWhatsapp ?? null,
        });
        /* La reserva ya descontó unidades en la base. Avisamos al catálogo para
           que recargue el stock y retire el acceso flotante, que a esta altura
           ofreceria "ver un pedido" que en realidad ya fue reservado.
           Aparte y a prueba de fallos: el pedido ya existe, y nada de lo que
           pase al recargar puede mostrarlo como fallido. */
        try {
          onPedidoReservado(firmaCarrito);
        } catch {
          /* El catálogo se actualiza en la próxima visita. */
        }
      }
      /* Un 409 puede traer el pedido y un aviso a la vez —la reserva se creó
         pero el WhatsApp del negocio está mal—: se muestran los dos. */
      if (resultado.estado >= 400 || !contenido.pedido) {
        setError(contenido.error || "No se pudo reservar el pedido.");
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

  async function descargarQrPago() {
    const qrPagoUrl = datos.negocio.qrPagoUrl;
    if (!qrPagoUrl || descargandoQr) return;

    setDescargandoQr(true);
    setErrorDescarga("");

    try {
      const respuesta = await fetch(qrPagoUrl);
      if (!respuesta.ok) {
        throw new Error("No se pudo obtener el QR de pago.");
      }

      const imagen = await respuesta.blob();
      if (!imagen.type.startsWith("image/")) {
        throw new Error("El archivo configurado no es una imagen válida.");
      }

      const extensiones: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };
      const extension = extensiones[imagen.type] ?? "png";
      const urlTemporal = URL.createObjectURL(imagen);
      const enlace = document.createElement("a");
      enlace.href = urlTemporal;
      enlace.download = `qr-pago-${datos.negocio.slug || "negocio"}.${extension}`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(urlTemporal), 0);
      setQrDescargado(true);
    } catch {
      setErrorDescarga(
        "No se pudo descargar el QR de pago. Mantén presionada la imagen para guardarla.",
      );
    } finally {
      setDescargandoQr(false);
    }
  }

  return (
    <section className={styles.carrito} id="resumen-pedido">
      {/* «Todavía no agregaste productos» no se dice cuando acaba de hacer uno:
          el carrito está vacío justamente porque se convirtió en el pedido que
          se muestra abajo. */}
      {items.length === 0 && !pedidoVigente ? (
        <p className={styles.vacio}>
          Todavía no agregaste productos. Elige una opción del catálogo para preparar tu pedido.
        </p>
      ) : items.length === 0 ? null : (
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
                  disabled={
                    cantidad >= producto.maximoCantidad ||
                    (topeUnidades !== null && unidades >= topeUnidades)
                  }
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
          {/* Cada campo va en su bloque, con el rótulo pegado a su casilla.
              Sueltos en la rejilla, los rótulos y las casillas se acomodaban por
              posición, y eso solo funcionaba mientras los campos fueran dos
              exactos. */}
          <div className={styles.campos}>
            {/* Primero la mesa: es el único dato que el mozo necesita sí o sí
                para llevar el pedido, y el único que el comprador tiene delante
                de los ojos mientras completa el formulario. */}
            {datos.negocio.pideNumeroMesa ? (
              <div className={styles.campo}>
                <label htmlFor="pedido-numero-mesa">
                  Número de mesa <span>Opcional</span>
                </label>
                <input
                  id="pedido-numero-mesa"
                  maxLength={10}
                  onChange={(evento) => setNumeroMesa(evento.target.value)}
                  placeholder="Ej.: 5 o Terraza"
                  value={numeroMesa}
                />
              </div>
            ) : null}
            <div className={styles.campo}>
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
            </div>
            <div className={styles.campo}>
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

          {/* Donde Cloudflare dibuja la verificación: invisible, no ocupa lugar. */}
          <div ref={contenedorVerificacion} />

          {avisoTope ? (
            <p className={styles.error} id="aviso-tope-unidades">
              {avisoTope}
            </p>
          ) : null}

          <button
            aria-describedby={avisoTope ? "aviso-tope-unidades" : undefined}
            disabled={!puedeConfirmar || enviando}
            type="submit"
          >
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
            <div className={styles.accionesExito}>
              {pedidoVigente.enlaceWhatsapp ? (
                <a
                  href={pedidoVigente.enlaceWhatsapp}
                  onClick={() => {
                    setEntregado(true);
                    onAbrirWhatsapp?.();
                  }}
                  rel="noreferrer"
                  target="_blank"
                >
                  Continuar por WhatsApp
                </a>
              ) : (
                <p>Guarda el código y comunícate con el negocio por otro medio.</p>
              )}
              {datos.negocio.qrPagoUrl ? (
                <button
                  className={styles.descargarQr}
                  disabled={descargandoQr}
                  onClick={descargarQrPago}
                  type="button"
                >
                  {descargandoQr ? "Preparando descarga…" : "Descargar QR de pago"}
                </button>
              ) : null}
            </div>
            {errorDescarga ? <p className={styles.errorDescarga}>{errorDescarga}</p> : null}
            {/* Aparece recién al descargar el QR, que es el momento en que la
                indicación sirve. Puesta antes sería una advertencia sobre algo
                que todavía no pasó; puesta después, el comprador ya se fue.

                Sin esto, el negocio recibe un pago que no puede relacionar con
                ninguna reserva: el QR no dice quién pagó. */}
            {qrDescargado ? (
              <p className={styles.avisoComprobante}>
                Ya tienes el QR. <strong>Cuando pagues, manda la captura del comprobante por
                WhatsApp junto con tu código {pedidoVigente.codigo}</strong>, así el negocio sabe
                qué reserva pagaste.
              </p>
            ) : null}
            {/* Después del pedido y no antes: pedir una calificación mientras
                alguien decide qué comprar es interrumpirlo; pedirla cuando ya
                pidió es preguntarle a alguien contento. */}
            {datos.negocio.resenasUrl ? (
              <p className={styles.resenas}>
                <a href={datos.negocio.resenasUrl} rel="noreferrer" target="_blank">
                  <Icono nombre="mapa" />
                  Califica a {datos.negocio.nombre} en Google
                </a>
              </p>
            ) : null}
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
