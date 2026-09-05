import type { ProductoPlantilla } from "../plantillas/tipos";

export type PedidoGuardado = {
  cantidades: Record<string, number>;
  elegidos: Record<string, ProductoPlantilla>;
};

const PEDIDO_VACIO: PedidoGuardado = { cantidades: {}, elegidos: {} };

export function clavePedido(negocioId: string) {
  return `mipuesto-pedido-${negocioId}`;
}

/* Se guarda en la sesión y no de forma permanente: el pedido acompaña la
   visita, y una selección de hace tres días mostraría precios que ya cambiaron.
   El total que se cobra lo recalcula la base al reservar, así que esta copia es
   solo para mostrar. */
export function leerPedidoGuardado(negocioId: string): PedidoGuardado {
  if (typeof window === "undefined") return PEDIDO_VACIO;

  try {
    const crudo = window.sessionStorage.getItem(clavePedido(negocioId));
    if (!crudo) return PEDIDO_VACIO;

    const datos = JSON.parse(crudo) as Partial<PedidoGuardado>;
    const elegidos = normalizarElegidos(datos.elegidos);
    const cantidades = normalizarCantidades(datos.cantidades, elegidos);
    return { cantidades, elegidos };
  } catch {
    return PEDIDO_VACIO;
  }
}

export function guardarPedido(negocioId: string, pedido: PedidoGuardado) {
  if (typeof window === "undefined") return;

  try {
    if (Object.keys(pedido.cantidades).length === 0) {
      window.sessionStorage.removeItem(clavePedido(negocioId));
      return;
    }
    window.sessionStorage.setItem(clavePedido(negocioId), JSON.stringify(pedido));
  } catch {
    /* Sin espacio o con el almacenamiento bloqueado, el pedido sigue vivo en
       memoria: se pierde al recargar, que es peor que guardarlo pero mucho
       mejor que romper el catálogo. */
  }
}

function esProducto(valor: unknown): valor is ProductoPlantilla {
  if (typeof valor !== "object" || valor === null) return false;
  const producto = valor as Record<string, unknown>;
  return (
    typeof producto.id === "string" &&
    typeof producto.nombre === "string" &&
    typeof producto.precio === "number" &&
    typeof producto.maximoCantidad === "number"
  );
}

function normalizarElegidos(valor: unknown): Record<string, ProductoPlantilla> {
  if (typeof valor !== "object" || valor === null) return {};
  return Object.fromEntries(
    Object.entries(valor as Record<string, unknown>).filter(([, producto]) =>
      esProducto(producto),
    ) as Array<[string, ProductoPlantilla]>,
  );
}

/* Una cantidad sin su producto no se puede mostrar ni cobrar, así que se
   descarta en vez de arrastrar una fila fantasma hasta el resumen. */
function normalizarCantidades(
  valor: unknown,
  elegidos: Record<string, ProductoPlantilla>,
): Record<string, number> {
  if (typeof valor !== "object" || valor === null) return {};

  return Object.fromEntries(
    Object.entries(valor as Record<string, unknown>).flatMap(([id, cantidad]) => {
      const producto = elegidos[id];
      if (!producto) return [];
      if (typeof cantidad !== "number" || !Number.isInteger(cantidad) || cantidad <= 0) {
        return [];
      }
      return [[id, Math.min(cantidad, producto.maximoCantidad)]];
    }),
  );
}
