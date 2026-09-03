import { NextResponse, type NextRequest } from "next/server";

import { evaluarHorario } from "../../../lib/horario";
import { validarSolicitudPedido } from "../../../lib/pedidos/validacion";
import { construirEnlaceWhatsapp, construirMensajePedido } from "../../../lib/whatsapp";
import { crearClienteSupabaseAdmin } from "../../../lib/supabase/admin";

type ItemPedidoGuardado = {
  codigo: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
};

type PedidoGuardado = {
  id: string;
  codigo: string;
  total: number;
  expira_en: string;
  items: ItemPedidoGuardado[];
  repetido: boolean;
};

const ERRORES_PEDIDO: Record<string, { estado: number; mensaje: string }> = {
  NEGOCIO_NO_DISPONIBLE: {
    estado: 404,
    mensaje: "Este negocio no está disponible para recibir pedidos.",
  },
  MODALIDAD_NO_PERMITE_PEDIDOS: {
    estado: 409,
    mensaje: "Este catálogo no usa pedidos con carrito.",
  },
  PRODUCTO_NO_DISPONIBLE: {
    estado: 409,
    mensaje: "Uno de los productos ya no está disponible. Actualiza el catálogo.",
  },
  STOCK_INSUFICIENTE: {
    estado: 409,
    mensaje: "Cambió la cantidad disponible. Revisa tu pedido e intenta nuevamente.",
  },
  LIMITE_PEDIDOS: {
    estado: 429,
    mensaje: "Llegaste al límite temporal de pedidos. Intenta nuevamente en 15 minutos.",
  },
  TELEFONO_INVALIDO: {
    estado: 400,
    mensaje: "Escribe un celular boliviano válido de 8 dígitos.",
  },
};

function obtenerIp(solicitud: NextRequest) {
  const ipCloudflare = solicitud.headers.get("cf-connecting-ip")?.trim();
  if (ipCloudflare) return ipCloudflare.slice(0, 64);
  const primeraIp = solicitud.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (primeraIp || "entorno-local").slice(0, 64);
}

async function crearHuellaIp(ip: string, secreto: string) {
  const clave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(firma), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function esPedidoGuardado(valor: unknown): valor is PedidoGuardado {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return false;
  const pedido = valor as Record<string, unknown>;
  return (
    typeof pedido.id === "string" &&
    typeof pedido.codigo === "string" &&
    typeof pedido.expira_en === "string" &&
    (typeof pedido.total === "number" || typeof pedido.total === "string") &&
    Array.isArray(pedido.items)
  );
}

function responderErrorBase(mensaje: string) {
  const coincidencia = Object.entries(ERRORES_PEDIDO).find(([codigo]) =>
    mensaje.includes(codigo),
  );
  return coincidencia?.[1] ?? {
    estado: 500,
    mensaje: "No se pudo reservar el pedido. Intenta nuevamente.",
  };
}

export async function POST(solicitud: NextRequest) {
  let entrada: unknown;
  try {
    entrada = await solicitud.json();
  } catch {
    return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
  }

  const validacion = validarSolicitudPedido(entrada);
  if (!validacion.correcto) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }

  let supabase;
  let secreto: string;
  try {
    supabase = crearClienteSupabaseAdmin();
    secreto =
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  } catch {
    return NextResponse.json(
      { error: "Los pedidos todavía no están habilitados en este entorno." },
      { status: 503 },
    );
  }

  const { data: negocio, error: errorNegocio } = await supabase
    .from("negocios")
    .select("nombre,telefono_whatsapp,tipo_negocio,horario,activo")
    .eq("slug", validacion.datos.slug)
    .eq("activo", true)
    .maybeSingle();

  if (errorNegocio || !negocio) {
    return NextResponse.json(
      { error: "Este negocio no está disponible para recibir pedidos." },
      { status: 404 },
    );
  }
  if (negocio.tipo_negocio !== "tienda_virtual") {
    return NextResponse.json({ error: "Este catálogo no usa pedidos con carrito." }, { status: 409 });
  }
  if (!evaluarHorario(negocio.horario).permiteAcciones) {
    return NextResponse.json(
      {
        error:
          "El negocio está fuera de su horario de atención. Tu carrito se conserva para más tarde.",
      },
      { status: 409 },
    );
  }

  const huellaIp = await crearHuellaIp(obtenerIp(solicitud), secreto);
  const { data, error } = await supabase.rpc("crear_pedido_reservado", {
    p_slug: validacion.datos.slug,
    p_items: validacion.datos.items.map((item) => ({
      producto_id: item.productoId,
      cantidad: item.cantidad,
    })),
    p_cliente_nombre: validacion.datos.clienteNombre as string,
    p_cliente_telefono: validacion.datos.clienteTelefono as string,
    p_idempotencia: validacion.datos.idempotencia,
    p_huella_ip: huellaIp,
  });

  if (error) {
    const respuesta = responderErrorBase(error.message);
    return NextResponse.json({ error: respuesta.mensaje }, { status: respuesta.estado });
  }
  if (!esPedidoGuardado(data)) {
    return NextResponse.json(
      { error: "El servidor no pudo confirmar los datos de la reserva." },
      { status: 500 },
    );
  }

  const items = data.items.map((item) => ({
    codigo: item.codigo,
    nombre: item.nombre,
    precio: Number(item.precio_unitario),
    cantidad: Number(item.cantidad),
  }));
  const mensaje = construirMensajePedido(negocio.nombre, items, data.codigo);
  const enlaceWhatsapp = construirEnlaceWhatsapp(negocio.telefono_whatsapp, mensaje);
  if (!enlaceWhatsapp) {
    return NextResponse.json(
      {
        error:
          "La reserva fue creada, pero el negocio debe corregir su número de WhatsApp. Guarda el código mostrado.",
        pedido: {
          codigo: data.codigo,
          total: Number(data.total),
          expiraEn: data.expira_en,
        },
      },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      pedido: {
        codigo: data.codigo,
        total: Number(data.total),
        expiraEn: data.expira_en,
        repetido: data.repetido === true,
      },
      enlaceWhatsapp,
    },
    { status: data.repetido ? 200 : 201 },
  );
}
