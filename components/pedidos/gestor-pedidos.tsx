"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ESTADOS_PEDIDO,
  esEstadoPedido,
  etiquetaEstadoPedido,
  formatearFechaPedido,
  type EstadoPedido,
} from "../../lib/pedidos/estado";
import { formatearPrecioBolivianos } from "../../lib/precios";
import { EstadoVacio, useAvisos, useConfirmacion } from "../ui";
import styles from "./gestor-pedidos.module.css";

export type ItemPedidoAdmin = {
  id: string;
  producto_codigo: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  controla_stock: boolean;
};

export type PedidoAdmin = {
  id: string;
  codigo: string;
  cliente_nombre: string | null;
  numero_mesa: string | null;
  cliente_telefono: string | null;
  total: number;
  estado: string;
  creado_en: string;
  expira_en: string | null;
  confirmado_en: string | null;
  confirmado_por: string | null;
  cancelado_en: string | null;
  cancelado_por: string | null;
  pedido_items: ItemPedidoAdmin[];
};

type PropiedadesGestor = {
  pedidosIniciales: PedidoAdmin[];
};

type Filtro = EstadoPedido | "todos";

/* El diálogo repite el detalle del pedido porque confirmar una venta descuenta
   stock: quien decide tiene que ver qué está aceptando, no solo el código. */
function ResumenPedido({ pedido }: { pedido: PedidoAdmin }) {
  return (
    <div className={styles.confirmacion}>
      <p>
        <strong>{pedido.codigo}</strong> · {pedido.cliente_nombre || "Cliente no informado"}
        {/* La mesa va en la primera línea de la confirmación: es el dato que
            decide a dónde va el plato, y quien confirma lo lee de un vistazo. */}
        {pedido.numero_mesa ? <> · <strong>Mesa {pedido.numero_mesa}</strong></> : null}
      </p>
      {pedido.pedido_items.length > 0 ? (
        <ul className={styles.items}>
          {pedido.pedido_items.map((item) => (
            <li key={item.id}>
              <div>
                <strong>
                  {item.cantidad} × {item.nombre}
                </strong>
              </div>
              <span>{formatearPrecioBolivianos(Number(item.subtotal))}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className={styles.totalConfirmacion}>
        <span>Total</span>
        <strong>{formatearPrecioBolivianos(Number(pedido.total))}</strong>
      </p>
    </div>
  );
}

export function GestorPedidos({ pedidosIniciales }: PropiedadesGestor) {
  const router = useRouter();
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();
  const [pedidos, setPedidos] = useState(pedidosIniciales);
  const [filtro, setFiltro] = useState<Filtro>("pendiente");
  const [procesando, setProcesando] = useState<string | null>(null);
  const visibles = useMemo(
    () => pedidos.filter((pedido) => filtro === "todos" || pedido.estado === filtro),
    [filtro, pedidos],
  );

  async function cambiarEstado(pedido: PedidoAdmin, estado: "confirmado" | "cancelado") {
    const confirmando = estado === "confirmado";
    const aceptado = await confirmar({
      titulo: confirmando ? "Confirmar la venta" : "Cancelar el pedido",
      descripcion: confirmando
        ? "Se descuenta el stock reservado y el pedido pasa a vendido."
        : "Se libera el stock reservado y el pedido queda cancelado.",
      destructiva: !confirmando,
      detalle: <ResumenPedido pedido={pedido} />,
      textoAccion: confirmando ? "Confirmar venta" : "Cancelar pedido",
      textoCancelar: "Volver",
    });

    if (!aceptado) return;

    setProcesando(pedido.id);
    try {
      const respuesta = await fetch(`/api/pedidos/${pedido.id}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      const contenido = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        pedido?: { estado?: string; actualizado_en?: string };
      };
      if (!respuesta.ok) throw new Error(contenido.error || "No se pudo cambiar el pedido.");

      setPedidos((actuales) =>
        actuales.map((actual) =>
          actual.id === pedido.id
            ? {
                ...actual,
                estado,
                confirmado_en:
                  estado === "confirmado"
                    ? contenido.pedido?.actualizado_en ?? new Date().toISOString()
                    : actual.confirmado_en,
                cancelado_en:
                  estado === "cancelado"
                    ? contenido.pedido?.actualizado_en ?? new Date().toISOString()
                    : actual.cancelado_en,
              }
            : actual,
        ),
      );
      mostrarAviso({
        titulo: confirmando ? "Venta confirmada" : "Pedido cancelado",
        mensaje: confirmando
          ? `Registramos la venta del pedido ${pedido.codigo}.`
          : `Liberamos el stock reservado del pedido ${pedido.codigo}.`,
        variante: confirmando ? "exito" : "informacion",
      });
      router.refresh();
    } catch (motivo) {
      mostrarAviso({
        titulo: confirmando ? "No se pudo confirmar la venta" : "No se pudo cancelar el pedido",
        mensaje:
          motivo instanceof Error
            ? motivo.message
            : "Revisa tu conexión e intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setProcesando(null);
    }
  }

  return (
    <div className={styles.gestor}>
      <nav aria-label="Filtrar pedidos" className={styles.filtros}>
        <button
          aria-pressed={filtro === "todos"}
          onClick={() => setFiltro("todos")}
          type="button"
        >
          Todos <span>{pedidos.length}</span>
        </button>
        {ESTADOS_PEDIDO.map((estado) => (
          <button
            aria-pressed={filtro === estado}
            key={estado}
            onClick={() => setFiltro(estado)}
            type="button"
          >
            {etiquetaEstadoPedido(estado)}{" "}
            <span>{pedidos.filter((pedido) => pedido.estado === estado).length}</span>
          </button>
        ))}
      </nav>

      {visibles.length === 0 ? (
        <EstadoVacio
          descripcion={
            filtro === "todos"
              ? "Cuando llegue uno, aparecerá aquí con su código, vencimiento y acciones disponibles."
              : "Prueba con otro filtro para ver los pedidos que ya resolviste."
          }
          titulo={
            filtro === "todos"
              ? "Todavía no recibiste pedidos"
              : `No hay pedidos ${etiquetaEstadoPedido(filtro).toLocaleLowerCase("es-BO")}`
          }
        />
      ) : (
        <ol className={styles.lista}>
          {visibles.map((pedido) => {
            const estado = esEstadoPedido(pedido.estado) ? pedido.estado : "expirado";
            return (
              <li className={styles.pedido} data-estado={estado} key={pedido.id}>
                <header>
                  <div>
                    <h2>{pedido.codigo}</h2>
                    <p>Recibido el {formatearFechaPedido(pedido.creado_en)}</p>
                  </div>
                  <span className={styles[estado]}>{etiquetaEstadoPedido(estado)}</span>
                </header>

                <div className={styles.cliente}>
                  <p><strong>Cliente:</strong> {pedido.cliente_nombre || "No informado"}</p>
                  <p><strong>Celular:</strong> {pedido.cliente_telefono || "No informado"}</p>
                  {pedido.numero_mesa ? (
                    <p><strong>Mesa:</strong> {pedido.numero_mesa}</p>
                  ) : null}
                </div>

                {pedido.pedido_items.length > 0 ? (
                  <ul className={styles.items}>
                    {pedido.pedido_items.map((item) => (
                      <li key={item.id}>
                        <div>
                          <strong>{item.cantidad} × {item.nombre}</strong>
                          <small>{item.producto_codigo}{item.controla_stock ? " / Con reserva de stock" : " / Sin control de stock"}</small>
                        </div>
                        <span>{formatearPrecioBolivianos(Number(item.subtotal))}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.sinDetalle}>Pedido anterior sin detalle normalizado.</p>
                )}

                <div className={styles.resumen}>
                  <p>
                    <span>Total verificado</span>
                    <strong>{formatearPrecioBolivianos(Number(pedido.total))}</strong>
                  </p>
                  {estado === "pendiente" ? (
                    <p>
                      <span>Reserva hasta</span>
                      <strong>{formatearFechaPedido(pedido.expira_en)}</strong>
                    </p>
                  ) : null}
                </div>

                {estado === "pendiente" ? (
                  <div className={styles.acciones}>
                    <button
                      disabled={procesando === pedido.id}
                      onClick={() => void cambiarEstado(pedido, "confirmado")}
                      type="button"
                    >
                      Confirmar venta
                    </button>
                    <button
                      disabled={procesando === pedido.id}
                      onClick={() => void cambiarEstado(pedido, "cancelado")}
                      type="button"
                    >
                      Cancelar pedido
                    </button>
                  </div>
                ) : (
                  <p className={styles.auditoria}>
                    {estado === "confirmado" && pedido.confirmado_en
                      ? `Confirmaste la venta el ${formatearFechaPedido(pedido.confirmado_en)}.`
                      : estado === "cancelado" && pedido.cancelado_en
                        ? `Cancelaste el pedido el ${formatearFechaPedido(pedido.cancelado_en)}.`
                        : estado === "expirado"
                          ? `La reserva venció el ${formatearFechaPedido(pedido.expira_en)}.`
                          : "Estado registrado."}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
