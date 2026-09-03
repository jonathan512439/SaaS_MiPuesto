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

export function GestorPedidos({ pedidosIniciales }: PropiedadesGestor) {
  const router = useRouter();
  const [pedidos, setPedidos] = useState(pedidosIniciales);
  const [filtro, setFiltro] = useState<Filtro>("pendiente");
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const visibles = useMemo(
    () => pedidos.filter((pedido) => filtro === "todos" || pedido.estado === filtro),
    [filtro, pedidos],
  );

  async function cambiarEstado(pedido: PedidoAdmin, estado: "confirmado" | "cancelado") {
    const accion = estado === "confirmado" ? "confirmar esta venta" : "cancelar este pedido";
    if (!window.confirm(`¿Quieres ${accion}? Código ${pedido.codigo}.`)) return;

    setProcesando(pedido.id);
    setError("");
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
      router.refresh();
    } catch (motivo) {
      setError(
        motivo instanceof Error
          ? motivo.message
          : "No se pudo cambiar el pedido. Intenta nuevamente.",
      );
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

      <div aria-live="polite">
        {error ? <p className={styles.error}>{error}</p> : null}
      </div>

      {visibles.length === 0 ? (
        <section className={styles.vacio}>
          <h2>No hay pedidos en este estado</h2>
          <p>Cuando llegue uno, aparecerá aquí con su código, vencimiento y acciones disponibles.</p>
        </section>
      ) : (
        <ol className={styles.lista}>
          {visibles.map((pedido) => {
            const estado = esEstadoPedido(pedido.estado) ? pedido.estado : "expirado";
            return (
              <li className={styles.pedido} key={pedido.id}>
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
