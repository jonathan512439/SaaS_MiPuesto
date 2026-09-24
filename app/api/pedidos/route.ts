import { NextResponse, type NextRequest } from "next/server";

import { evaluarHorario } from "../../../lib/horario";
import { responderErrorPedido } from "../../../lib/pedidos/errores-pedido";
import {
  MENSAJE_VERIFICACION_FALLIDA,
  decidirConTurnstile,
  leerModoTurnstile,
  leerSecretoTurnstile,
  verificarTurnstile,
} from "../../../lib/turnstile";
import {
  crearHuellaIp,
  leerSecretoHuella,
  obtenerIpSolicitud,
} from "../../../lib/huella-ip";
import { validarSolicitudPedido } from "../../../lib/pedidos/validacion";
import { construirEnlaceWhatsapp, construirMensajePedido } from "../../../lib/whatsapp";
import { crearClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { leerAtributos, type Atributo } from "../../../lib/catalogo/atributos";
import { valoresParaMostrar } from "../../../lib/catalogo/valores";
import { nombreConPresentacion } from "../../../lib/catalogo/variantes";

type ItemPedidoGuardado = {
  codigo: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  /* La presentación elegida, copiada por la base: «40,5», «M», «7,5 kg». */
  variante_nombre?: string | null;
  tipo_presentacion?: string | null;
};

type PedidoGuardado = {
  id: string;
  codigo: string;
  total: number;
  expira_en: string;
  items: ItemPedidoGuardado[];
  repetido: boolean;
};


/* Los datos propios de cada producto, listos para el mensaje, indexados por su
   código —que es lo que el pedido guarda de vuelta—.

   Dos consultas y no una por producto: una trae los productos y otra las
   definiciones de sus categorías. Sin las definiciones, un valor suelto no se
   puede formatear ni saber si todavía corresponde a un campo que existe. */
async function obtenerDatosDeProductos(
  supabase: ReturnType<typeof crearClienteSupabaseAdmin>,
  negocioId: string,
  productoIds: string[],
): Promise<Map<string, Array<{ nombre: string; texto: string }>>> {
  const porCodigo = new Map<string, Array<{ nombre: string; texto: string }>>();
  if (productoIds.length === 0) return porCodigo;

  const { data: productos } = await supabase
    .from("productos")
    .select("codigo,categoria_id,atributos")
    .eq("negocio_id", negocioId)
    .in("id", productoIds);
  if (!productos || productos.length === 0) return porCodigo;

  const categorias = [
    ...new Set(productos.map((producto) => producto.categoria_id).filter(Boolean)),
  ] as string[];
  if (categorias.length === 0) return porCodigo;

  const { data: definiciones } = await supabase
    .from("atributos_categoria")
    .select("categoria_id,clave,nombre,tipo,unidad,opciones,obligatorio,en_tarjeta,en_resumen")
    .eq("negocio_id", negocioId)
    .in("categoria_id", categorias)
    .order("orden");

  const porCategoria = new Map<string, Atributo[]>();
  for (const fila of definiciones ?? []) {
    const lista = porCategoria.get(fila.categoria_id) ?? [];
    lista.push(...leerAtributos([fila]));
    porCategoria.set(fila.categoria_id, lista);
  }

  for (const producto of productos) {
    const lista = porCategoria.get(producto.categoria_id ?? "") ?? [];
    const datos = valoresParaMostrar(lista, producto.atributos, "resumen").map(
      ({ nombre, texto }) => ({ nombre, texto }),
    );
    if (datos.length > 0) porCodigo.set(producto.codigo, datos);
  }
  return porCodigo;
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
  let secretoTurnstile: string;
  try {
    supabase = crearClienteSupabaseAdmin();
    secreto = leerSecretoHuella();
    secretoTurnstile = leerSecretoTurnstile();
  } catch {
    return NextResponse.json(
      { error: "Los pedidos todavía no están habilitados en este entorno." },
      { status: 503 },
    );
  }

  /* Tres cosas que no dependen una de otra, **en paralelo**: la verificación
     con Cloudflare, el negocio y la firma de la IP. En fila sumaban sus
     esperas —la de Cloudflare sola son un par de décimas— y el dueño lo notó
     como un pedido que «tarda un poco demás».

     El orden de las decisiones no cambia: sin verificación se rechaza antes de
     escribir nada —leer el negocio no es escribir—, y antes del horario, para
     que tantear horarios también cueste. Un programa que cambia de IP podía
     apartar todo el stock de una tienda sin comprar nada. */
  const ip = obtenerIpSolicitud(solicitud);
  const [verificacion, { data: negocio, error: errorNegocio }, huellaIp] = await Promise.all([
    verificarTurnstile((entrada as { verificacion?: unknown }).verificacion, ip, secretoTurnstile),
    supabase
      .from("negocios")
      .select("id,nombre,telefono_whatsapp,tipo_negocio,horario,activo")
      .eq("slug", validacion.datos.slug)
      .eq("activo", true)
      .maybeSingle(),
    crearHuellaIp(ip, secreto),
  ]);
  if (!decidirConTurnstile(verificacion, leerModoTurnstile(), "pedido")) {
    return NextResponse.json({ error: MENSAJE_VERIFICACION_FALLIDA }, { status: 403 });
  }

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

  /* Los datos de cada producto para el mensaje se piden **mientras** la base
     crea el pedido: son solo lecturas y no dependen de él. Si el pedido falla,
     se descartan. */
  const datosDeProductos = obtenerDatosDeProductos(
    supabase,
    negocio.id,
    validacion.datos.items.map((item) => item.productoId),
  ).catch(() => new Map<string, Array<{ nombre: string; texto: string }>>());

  const { data, error } = await supabase.rpc("crear_pedido_reservado", {
    p_slug: validacion.datos.slug,
    p_items: validacion.datos.items.map((item) => ({
      producto_id: item.productoId,
      variante_id: item.varianteId,
      cantidad: item.cantidad,
    })),
    p_cliente_nombre: validacion.datos.clienteNombre as string,
    p_cliente_telefono: validacion.datos.clienteTelefono as string,
    p_numero_mesa: validacion.datos.numeroMesa as string,
    p_idempotencia: validacion.datos.idempotencia,
    p_huella_ip: huellaIp,
  });

  if (error) {
    const respuesta = responderErrorPedido(error.message);
    return NextResponse.json({ error: respuesta.mensaje }, { status: respuesta.estado });
  }
  if (!esPedidoGuardado(data)) {
    return NextResponse.json(
      { error: "El servidor no pudo confirmar los datos de la reserva." },
      { status: 500 },
    );
  }

  /* Los datos propios de cada producto, para que el pedido llegue listo para
     preparar. Se pidieron junto con el pedido, más arriba, y **no se guardan en
     el pedido**: el pedido conserva su copia de nombre y precio porque son los
     que se cobran, mientras
     que estos son descripción. Guardarlos también obligaría a rehacer
     `crear_pedido_reservado`, que es la función que reserva existencias, y no
     vale ese riesgo por un renglón de un mensaje que se manda al instante.
     Si fallan, el pedido sale igual sin ellos: ya está creado y cobrado. */
  const datosPorCodigo = await datosDeProductos;

  const items = data.items.map((item) => ({
    codigo: item.codigo,
    /* El nombre con su presentación: el dueño tiene que leer «Zapatilla Runner
       (N.º 40,5)» y no adivinar cuál de los números le pidieron. */
    nombre: nombreConPresentacion(item.nombre, item.tipo_presentacion, item.variante_nombre),
    precio: Number(item.precio_unitario),
    cantidad: Number(item.cantidad),
    datos: datosPorCodigo.get(item.codigo),
  }));
  const mensaje = construirMensajePedido(
    negocio.nombre,
    items,
    data.codigo,
    validacion.datos.numeroMesa,
  );
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
