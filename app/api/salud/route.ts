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
/* Es pública y sin límite a propósito —cualquier vigilante tiene que poder
   consultarla sin credenciales—, pero cada llamada abría el cliente
   privilegiado y hacía dos consultas. Quince segundos de memoria bastan: un
   monitor pregunta cada uno o cinco minutos, y quien la martille recibe la
   misma respuesta sin tocar la base.

   La caché es por isolate, así que no es una barrera: es un colchón. La barrera
   de verdad la pone `Cache-Control`, que deja que el borde de Cloudflare
   absorba las repeticiones antes de que lleguen acá. */
/* Una marca de versión, para saber de un vistazo qué código está sirviendo el
   sitio sin adivinar. Se lee en `/api/salud`. Cuando cambia acá y aparece allá
   sin que nadie haya desplegado a mano, el despliegue automático está andando.
   Se bumpea en cambios que importa poder confirmar en producción. */
const MARCA_DESPLIEGUE = "cupo-de-su-plan";

const VIDA_CACHE_MS = 15_000;

let respuestaCacheada: { cuerpo: Record<string, unknown>; estado: number; hasta: number } | null =
  null;

function responder(cuerpo: Record<string, unknown>, estado: number) {
  respuestaCacheada = { cuerpo, estado, hasta: Date.now() + VIDA_CACHE_MS };
  return NextResponse.json(cuerpo, {
    status: estado,
    headers: { "Cache-Control": `public, max-age=${VIDA_CACHE_MS / 1000}` },
  });
}

export async function GET() {
  if (respuestaCacheada && respuestaCacheada.hasta > Date.now()) {
    return NextResponse.json(respuestaCacheada.cuerpo, {
      status: respuestaCacheada.estado,
      headers: { "Cache-Control": `public, max-age=${VIDA_CACHE_MS / 1000}` },
    });
  }

  try {
    const supabase = crearClienteSupabaseAdmin();

    const [negocios, tareas] = await Promise.all([
      supabase.from("negocios").select("id", { count: "exact", head: true }),
      supabase.rpc("estado_tareas"),
    ]);

    if (negocios.error) {
      return responder({ estado: "sin_base" }, 503);
    }

    /* Si la vigilancia no responde, se informa la base sana y la vigilancia
       caída por separado: confundir las dos cosas manda a revisar el lugar
       equivocado. */
    if (tareas.error) {
      return responder({ estado: "sin_vigilancia" }, 503);
    }

    const atrasadas = (tareas.data ?? []).filter((tarea) => tarea.atrasada).length;
    if (atrasadas > 0) {
      return responder({ estado: "tareas_atrasadas", atrasadas }, 503);
    }

    return responder({ estado: "ok", marca: MARCA_DESPLIEGUE }, 200);
  } catch {
    return responder({ estado: "sin_configurar" }, 503);
  }
}
