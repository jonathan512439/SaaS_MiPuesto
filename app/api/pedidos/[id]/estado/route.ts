import { NextResponse, type NextRequest } from "next/server";

import { esUuid } from "../../../../../lib/catalogo/validacion";
import { crearClienteSupabaseAdmin } from "../../../../../lib/supabase/admin";
import { crearClienteSupabaseServidor } from "../../../../../lib/supabase/server";

type ContextoRuta = { params: Promise<{ id: string }> };

export async function POST(solicitud: NextRequest, contexto: ContextoRuta) {
  const supabaseSesion = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabaseSesion.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  const { id } = await contexto.params;
  if (!esUuid(id)) {
    return NextResponse.json({ error: "El pedido no es válido." }, { status: 400 });
  }

  let entrada: unknown;
  try {
    entrada = await solicitud.json();
  } catch {
    return NextResponse.json({ error: "La acción enviada no es válida." }, { status: 400 });
  }
  const estado =
    typeof entrada === "object" && entrada !== null && "estado" in entrada
      ? entrada.estado
      : null;
  if (estado !== "confirmado" && estado !== "cancelado") {
    return NextResponse.json(
      { error: "Elige confirmar la venta o cancelar el pedido." },
      { status: 400 },
    );
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = crearClienteSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: "La gestión de pedidos todavía no está habilitada en este entorno." },
      { status: 503 },
    );
  }

  const { data, error } = await supabaseAdmin.rpc("cambiar_estado_pedido_admin", {
    p_pedido_id: id,
    p_admin_user_id: idUsuario,
    p_nuevo_estado: estado,
  });

  if (error?.message.includes("PEDIDO_NO_ENCONTRADO")) {
    return NextResponse.json({ error: "No se encontró ese pedido en tu negocio." }, { status: 404 });
  }
  if (error?.message.includes("PEDIDO_NO_PENDIENTE")) {
    return NextResponse.json(
      { error: "El pedido ya fue atendido o su reserva venció. Actualiza la lista." },
      { status: 409 },
    );
  }
  if (error || !data) {
    return NextResponse.json(
      { error: "No se pudo cambiar el estado del pedido. Intenta nuevamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ pedido: data });
}
