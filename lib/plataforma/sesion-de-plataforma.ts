import { NextResponse } from "next/server";

import { crearClienteSupabaseServidor } from "../supabase/server";

/* La sesión de quien administra la plataforma, **con segundo factor**.
 *
 * La usan todas las rutas de `/api/plataforma`. La base también lo exige
 * —`es_admin_plataforma_con_2fa()`, desde el 2026-10-21—, así que esto no es la
 * única barrera: es la que devuelve un motivo claro en vez de «no se pudo», y
 * la que cuida lo que la base no ve —un archivo en R2, una invitación hecha con
 * la clave de servicio—.
 *
 * Hasta esa fecha las rutas que solo escribían en la base no la usaban, con la
 * idea de que la política de la tabla decidía; pero las políticas pedían estar
 * en la lista y no el segundo factor, y con la contraseña sola se podía todo.
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
