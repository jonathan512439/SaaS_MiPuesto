import { NextResponse } from "next/server";

import { crearClienteSupabaseServidor } from "../supabase/server";

/* La sesión de quien administra la plataforma, **con segundo factor**.
 *
 * Las rutas que solo escriben en la base no lo necesitan: la política de la
 * tabla es la que decide. Este control es para las que además tocan algo que
 * la base no protege —un archivo en R2—, y para devolver un motivo claro en
 * vez de «no se pudo».
 */
export async function sesionDePlataforma() {
  const supabase = await crearClienteSupabaseServidor();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) {
    return { rechazo: NextResponse.json({ error: "Sesión no válida." }, { status: 401 }) } as const;
  }
  if (data.claims.aal !== "aal2") {
    return {
      rechazo: NextResponse.json(
        { error: "Confirma tu segundo factor en Plataforma y vuelve a intentarlo." },
        { status: 403 },
      ),
    } as const;
  }
  const { data: esAdmin } = await supabase.rpc("es_admin_plataforma");
  if (!esAdmin) {
    return {
      rechazo: NextResponse.json({ error: "Tu cuenta no administra la plataforma." }, { status: 403 }),
    } as const;
  }
  return { supabase } as const;
}
