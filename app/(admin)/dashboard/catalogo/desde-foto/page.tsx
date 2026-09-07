import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CargaDesdeFoto } from "../../../../../components/catalogo/carga-desde-foto";
import type { CategoriaCatalogo } from "../../../../../lib/catalogo/tipos";
import { TOPE_FOTOS_POR_MES } from "../../../../../lib/ia/servidor";
import { crearClienteSupabaseServidor } from "../../../../../lib/supabase/server";
import styles from "../catalogo.module.css";

export const metadata: Metadata = {
  title: "Cargar desde una foto | MiPuesto",
  description: "Cargá tu catálogo fotografiando tu lista de precios.",
};

export const dynamic = "force-dynamic";

export default async function PaginaCargaDesdeFoto() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login?motivo=sesion");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("id,foto_ia_habilitada")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();
  if (!negocio) redirect("/dashboard/configuracion");

  /* Sin la función habilitada, la página no existe para este negocio. Mostrarla
     apagada, con un botón que no hace nada, es peor que no mostrarla: enseña una
     puerta que no se puede abrir. */
  if (!negocio.foto_ia_habilitada) redirect("/dashboard/catalogo");

  const [{ data: categorias }, { data: uso }] = await Promise.all([
    supabase
      .from("categorias")
      .select("id,nombre,orden")
      .eq("negocio_id", negocio.id)
      .order("orden")
      .order("nombre"),
    supabase
      .from("uso_ia_negocio")
      .select("cantidad")
      .eq("negocio_id", negocio.id)
      .eq("mes", `${new Date().toISOString().slice(0, 8)}01`)
      .maybeSingle(),
  ]);

  return (
    <main className={styles.contenido}>
      <header className={styles.encabezado}>
        <h1>Cargar desde una foto</h1>
        <p>
          Fotografiá tu lista de precios y te armamos el borrador. Vos revisás y confirmás:
          nada se publica sin que lo mires.
        </p>
        <Link href="/dashboard/catalogo">Volver al catálogo</Link>
      </header>

      <CargaDesdeFoto
        categorias={(categorias ?? []) as CategoriaCatalogo[]}
        fotosUsadas={uso?.cantidad ?? 0}
        topeFotos={TOPE_FOTOS_POR_MES}
      />
    </main>
  );
}
