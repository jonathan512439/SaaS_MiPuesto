import { NextResponse } from "next/server";

import { crearClienteSupabaseAdmin } from "../../../lib/supabase/admin";

export const dynamic = "force-dynamic";

/* Un solo punto para que un vigilante externo sepa si el sistema está sano, sin
 * abrir una cuenta en ningún servicio: basta con que algo pida esta dirección
 * cada pocos minutos y avise cuando deje de responder 200.
 *
 * Responde en grueso y a propósito. La respuesta es pública para que cualquier
 * vigilante pueda leerla, así que no dice qué tarea falló ni desde cuándo: eso
 * se consulta con `npm run salud`, que corre con la clave privilegiada. Un
 * atacante no aprende nada acá que no sepa mirando si la página carga.
 */
export async function GET() {
  try {
    const supabase = crearClienteSupabaseAdmin();

    const [negocios, tareas] = await Promise.all([
      supabase.from("negocios").select("id", { count: "exact", head: true }),
      supabase.rpc("estado_tareas"),
    ]);

    if (negocios.error) {
      return NextResponse.json({ estado: "sin_base" }, { status: 503 });
    }

    /* Si la vigilancia no responde, se informa la base sana y la vigilancia
       caída por separado: confundir las dos cosas manda a revisar el lugar
       equivocado. */
    if (tareas.error) {
      return NextResponse.json({ estado: "sin_vigilancia" }, { status: 503 });
    }

    const atrasadas = (tareas.data ?? []).filter((tarea) => tarea.atrasada).length;
    if (atrasadas > 0) {
      return NextResponse.json({ estado: "tareas_atrasadas", atrasadas }, { status: 503 });
    }

    return NextResponse.json({ estado: "ok" });
  } catch {
    return NextResponse.json({ estado: "sin_configurar" }, { status: 503 });
  }
}
