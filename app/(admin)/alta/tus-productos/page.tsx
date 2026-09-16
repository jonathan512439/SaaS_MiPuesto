import { redirect } from "next/navigation";

import { PasoTusProductos } from "../../../../components/alta/paso-tus-productos";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import { RUTA_SIN_NEGOCIO } from "../../../../lib/panel/rutas";

export default async function PaginaTusProductos() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("id")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (!negocio) redirect(RUTA_SIN_NEGOCIO);

  /* Con `head` y `count`: hace falta saber cuántos hay, no cuáles son. */
  const [{ count: productos }, { count: categorias }] = await Promise.all([
    supabase.from("productos").select("id", { count: "exact", head: true }).eq("negocio_id", negocio.id),
    supabase.from("categorias").select("id", { count: "exact", head: true }).eq("negocio_id", negocio.id),
  ]);

  return <PasoTusProductos categorias={categorias ?? 0} productos={productos ?? 0} />;
}
