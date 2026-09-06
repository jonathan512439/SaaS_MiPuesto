import { esUuid } from "../catalogo/validacion";

export const LIMITE_ITEMS_PEDIDO = 30;
export const LIMITE_CANTIDAD_ITEM = 99;

export type ItemSolicitudPedido = {
  productoId: string;
  cantidad: number;
};

export type SolicitudPedidoValidada = {
  slug: string;
  items: ItemSolicitudPedido[];
  clienteNombre: string | null;
  clienteTelefono: string | null;
  numeroMesa: string | null;
  idempotencia: string;
};

type ResultadoValidacion =
  | { correcto: true; datos: SolicitudPedidoValidada }
  | { correcto: false; error: string };

function normalizarTextoOpcional(valor: unknown, maximo: number) {
  if (valor === undefined || valor === null || valor === "") return null;
  if (typeof valor !== "string") return undefined;
  const texto = valor.trim().replace(/\s+/g, " ");
  if (!texto) return null;
  if (texto.length > maximo) return undefined;
  return texto;
}

export function normalizarTelefonoCliente(valor: unknown) {
  if (valor === undefined || valor === null || valor === "") return null;
  if (typeof valor !== "string") return undefined;
  const digitos = valor.replace(/\D/g, "");
  const normalizado = digitos.length === 8 ? `591${digitos}` : digitos;
  return /^591[67]\d{7}$/.test(normalizado) ? normalizado : undefined;
}

export function validarSolicitudPedido(entrada: unknown): ResultadoValidacion {
  if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) {
    return { correcto: false, error: "Los datos del pedido no son válidos." };
  }

  const valor = entrada as Record<string, unknown>;
  const slug = typeof valor.slug === "string" ? valor.slug.trim().toLowerCase() : "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 63) {
    return { correcto: false, error: "El negocio del pedido no es válido." };
  }

  if (
    !Array.isArray(valor.items) ||
    valor.items.length === 0 ||
    valor.items.length > LIMITE_ITEMS_PEDIDO
  ) {
    return { correcto: false, error: "Agrega entre 1 y 30 productos al pedido." };
  }

  const items: ItemSolicitudPedido[] = [];
  const identificadores = new Set<string>();
  for (const item of valor.items) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return { correcto: false, error: "Hay un producto no válido en el pedido." };
    }
    const datosItem = item as Record<string, unknown>;
    if (
      !esUuid(datosItem.productoId) ||
      !Number.isInteger(datosItem.cantidad) ||
      Number(datosItem.cantidad) < 1 ||
      Number(datosItem.cantidad) > LIMITE_CANTIDAD_ITEM ||
      identificadores.has(datosItem.productoId)
    ) {
      return { correcto: false, error: "Revisa los productos y sus cantidades." };
    }
    identificadores.add(datosItem.productoId);
    items.push({
      productoId: datosItem.productoId,
      cantidad: Number(datosItem.cantidad),
    });
  }

  const clienteNombre = normalizarTextoOpcional(valor.clienteNombre, 80);
  if (clienteNombre === undefined) {
    return { correcto: false, error: "El nombre admite hasta 80 caracteres." };
  }

  const clienteTelefono = normalizarTelefonoCliente(valor.clienteTelefono);
  if (clienteTelefono === undefined) {
    return {
      correcto: false,
      error: "Escribe un celular boliviano válido de 8 dígitos.",
    };
  }

  /* Diez caracteres: en los locales reales las mesas se llaman «A1», «Barra» o
     «Terraza». Que el negocio realmente pida mesa lo comprueba la base, que es
     la única que sabe de qué negocio se trata. */
  const numeroMesa = normalizarTextoOpcional(valor.numeroMesa, 10);
  if (numeroMesa === undefined) {
    return { correcto: false, error: "El número de mesa admite hasta 10 caracteres." };
  }

  if (!esUuid(valor.idempotencia)) {
    return { correcto: false, error: "No se pudo identificar este intento de pedido." };
  }

  return {
    correcto: true,
    datos: {
      slug,
      items,
      clienteNombre,
      clienteTelefono,
      numeroMesa,
      idempotencia: valor.idempotencia,
    },
  };
}
