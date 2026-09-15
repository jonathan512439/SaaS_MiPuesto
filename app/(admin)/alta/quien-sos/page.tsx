import { redirect } from "next/navigation";

import { PasoQuienSos } from "../../../../components/alta/paso-quien-sos";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

/* Los valores de arranque se leen en el servidor y no se piden después desde el
   navegador: quien vuelve al paso 1 a corregir algo tiene que ver lo que ya
   había escrito, no un formulario vacío que se rellena solo un segundo después. */
export default async function PaginaQuienSos() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("nombre,slug,nombre_admin")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (!negocio) redirect("/dashboard/configuracion");

  return (
    <PasoQuienSos
      nombreAdminInicial={negocio.nombre_admin ?? ""}
      nombreInicial={negocio.nombre ?? ""}
      slugInicial={negocio.slug ?? ""}
    />
  );
}
