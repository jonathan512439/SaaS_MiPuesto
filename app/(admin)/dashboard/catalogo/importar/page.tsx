import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ImportarPlanilla } from "../../../../../components/catalogo/importar-planilla";
import type { CategoriaCatalogo } from "../../../../../lib/catalogo/tipos";
import { crearClienteSupabaseServidor } from "../../../../../lib/supabase/server";
import styles from "../catalogo.module.css";

export const metadata: Metadata = {
  title: "Importar tu Excel | MiPuesto",
  description: "Cargá tu catálogo desde la planilla que ya tenés.",
};

export const dynamic = "force-dynamic";

/* A diferencia de la carga desde una foto, esta página **no se cierra con
   ninguna llave**: no consume la cuota de Google ni depende de ella, así que no
   hay nada que reservar para unos pocos negocios. Todo negocio con catálogo
   puede importar su planilla. */
export default async function PaginaImportarPlanilla() {
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

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id,nombre,orden")
    .eq("negocio_id", negocio.id)
    .order("orden")
    .order("nombre");

  return (
    <main className={styles.contenido}>
      <header className={styles.encabezado}>
        <h1>Importar tu Excel</h1>
        <p>
          Si ya llevás tu inventario en una planilla, no hace falta volver a escribirlo. Subí el
          archivo, decinos qué columna es cuál y revisá antes de crear.
        </p>
        <Link href="/dashboard/catalogo">Volver al catálogo</Link>
      </header>

      <ImportarPlanilla categorias={(categorias ?? []) as CategoriaCatalogo[]} />
    </main>
  );
}
