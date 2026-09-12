import { NextResponse, type NextRequest } from "next/server";

import { obtenerOcupacion, obtenerProductoAgendable } from "../../../../../lib/agenda/servidor";
import { proximosDias } from "../../../../../lib/agenda/horarios";
import { esUuid } from "../../../../../lib/catalogo/validacion";
import { crearClienteSupabaseAdmin } from "../../../../../lib/supabase/admin";

/* Los horarios libres de un producto que vende tiempo.
 *
 * Es lo que sustituye al `variants: ['10:00','11:30']` del diseño de referencia:
 * allá la lista estaba escrita a mano y acá **se calcula** con la semana que
 * configuró el dueño, la duración del turno y las citas ya tomadas.
 */

export const dynamic = "force-dynamic";

export async function GET(
  solicitud: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const productoId = solicitud.nextUrl.searchParams.get("producto") ?? "";
  if (!esUuid(productoId)) {
    return NextResponse.json({ error: "El producto no es válido." }, { status: 400 });
  }

  const supabase = crearClienteSupabaseAdmin();
  const { data: negocio } = await supabase
    .from("negocios")
    .select("id")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();
  if (!negocio) {
    return NextResponse.json({ error: "Este negocio no está disponible." }, { status: 404 });
  }

  const producto = await obtenerProductoAgendable(supabase, negocio.id, productoId);
  if (!producto) {
    /* Un producto que no se agenda y uno que no existe dan la misma respuesta:
       distinguirlos le diría a un curioso qué productos hay en un catálogo. */
    return NextResponse.json({ dias: [] });
  }

  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + (producto.agenda.diasMaximos + 1) * 86_400_000);
  const ocupados = await obtenerOcupacion(supabase, producto.categoriaId, ahora, hasta);

  return NextResponse.json({
    dias: proximosDias(producto.agenda, ocupados, ahora),
    duracionMinutos: producto.agenda.duracionMinutos,
  });
}
