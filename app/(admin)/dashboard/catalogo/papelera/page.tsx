import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PapeleraProductos } from "../../../../../components/catalogo/papelera-productos";
import { DIAS_PAPELERA } from "../../../../../lib/catalogo/papelera";
import type { ProductoEnPapelera } from "../../../../../lib/catalogo/papelera";
import { crearClienteSupabaseServidor } from "../../../../../lib/supabase/server";
import { obtenerVariablesPublicasSupabase } from "../../../../../lib/supabase/variables";
import styles from "../catalogo.module.css";

export const metadata: Metadata = {
  title: "Papelera | MiPuesto",
  description: "Productos que borraste y todavía podés recuperar.",
};

export default async function PaginaPapelera() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login?motivo=sesion");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("id")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();
  if (!negocio) redirect("/dashboard/configuracion");

  const { data: productos } = await supabase
    .from("productos")
    .select("id,codigo,nombre,precio,fotos,eliminado_en")
    .eq("negocio_id", negocio.id)
    .not("eliminado_en", "is", null)
    .order("eliminado_en", { ascending: true });

  const { url } = obtenerVariablesPublicasSupabase();

  return (
    <main className={styles.contenido}>
      <header className={styles.encabezado}>
        <h1>Papelera</h1>
        <p>
          Lo que borrás se guarda {DIAS_PAPELERA} días y podés recuperarlo con sus
          fotografías. Después se borra solo.
        </p>
        <Link href="/dashboard/catalogo">Volver al catálogo</Link>
      </header>

      <PapeleraProductos
        productos={(productos ?? []) as ProductoEnPapelera[]}
        urlSupabase={url}
      />
    </main>
  );
}
