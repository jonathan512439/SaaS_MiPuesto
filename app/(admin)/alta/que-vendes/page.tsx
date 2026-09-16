import { redirect } from "next/navigation";

import { PasoQueVendes } from "../../../../components/alta/paso-que-vendes";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import { RUTA_SIN_NEGOCIO } from "../../../../lib/panel/rutas";

export default async function PaginaQueVendes() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("rubro")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (!negocio) redirect(RUTA_SIN_NEGOCIO);

  return <PasoQueVendes rubroInicial={negocio.rubro ?? ""} />;
}
