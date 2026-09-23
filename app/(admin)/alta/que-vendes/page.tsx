import { redirect } from "next/navigation";

import { PasoQueVendes } from "../../../../components/alta/paso-que-vendes";
import { leerPresenciaDelNegocio } from "../../../../lib/negocios/presencia-pagina";
import { RUTA_SIN_NEGOCIO } from "../../../../lib/panel/rutas";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

export default async function PaginaQueVendes() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login");

  const presencia = await leerPresenciaDelNegocio(supabase, idUsuario);
  if (!presencia) redirect(RUTA_SIN_NEGOCIO);

  return <PasoQueVendes {...presencia} />;
}
