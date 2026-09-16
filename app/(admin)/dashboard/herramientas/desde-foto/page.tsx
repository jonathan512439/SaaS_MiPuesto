import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CargaDesdeFoto } from "../../../../../components/catalogo/carga-desde-foto";
import type { CategoriaCatalogo } from "../../../../../lib/catalogo/tipos";
import { TOPE_FOTOS_POR_MES } from "../../../../../lib/ia/servidor";
import { crearClienteSupabaseServidor } from "../../../../../lib/supabase/server";
import styles from "../herramientas.module.css";
import { EncabezadoPanel } from "../../../../../components/dashboard/encabezado-panel";
import { COLUMNAS_CATEGORIA } from "../../../../../lib/catalogo/columnas";
import { RUTAS_PANEL, RUTA_SIN_NEGOCIO } from "../../../../../lib/panel/rutas";

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
  if (!negocio) redirect(RUTA_SIN_NEGOCIO);

  /* Sin la función habilitada, la página no existe para este negocio. Mostrarla
     apagada, con un botón que no hace nada, es peor que no mostrarla: enseña una
     puerta que no se puede abrir. */
  if (!negocio.foto_ia_habilitada) redirect(RUTAS_PANEL.catalogo);

  const [{ data: categorias }, { data: uso }] = await Promise.all([
    supabase
      .from("categorias")
      .select(COLUMNAS_CATEGORIA)
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

  /* Si el negocio ya lleva la cuenta en algún producto. Es la señal más honesta
     de «este catálogo cuenta existencias»: no hay un ajuste de negocio para
     esto, el control es de cada producto, y preguntárselo al dueño otra vez
     sería preguntarle algo que sus propios datos ya contestan. Se pide un solo
     registro, no la lista entera. */
  const { data: conStock } = await supabase
    .from("productos")
    .select("id")
    .eq("negocio_id", negocio.id)
    .eq("controla_stock", true)
    .is("eliminado_en", null)
    .limit(1)
    .maybeSingle();
  const negocioLlevaStock = conStock !== null;

  return (
    <main className={styles.contenido}>
      <EncabezadoPanel
        accion={<Link href={RUTAS_PANEL.catalogo}>Volver al catálogo</Link>}
        descripcion="Fotografiá tu lista de precios y te armamos el borrador. Vos revisás y confirmás: nada se publica sin que lo mires."
        titulo="Cargar desde una foto"
      />

      <CargaDesdeFoto
        categorias={(categorias ?? []) as CategoriaCatalogo[]}
        fotosUsadas={uso?.cantidad ?? 0}
        negocioLlevaStock={negocioLlevaStock}
        topeFotos={TOPE_FOTOS_POR_MES}
      />
    </main>
  );
}
