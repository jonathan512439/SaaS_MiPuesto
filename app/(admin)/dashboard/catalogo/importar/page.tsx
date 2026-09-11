import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ImportarPlanilla } from "../../../../../components/catalogo/importar-planilla";
import type { CategoriaCatalogo } from "../../../../../lib/catalogo/tipos";
import { crearClienteSupabaseServidor } from "../../../../../lib/supabase/server";
import styles from "../catalogo.module.css";
import { EncabezadoPanel } from "../../../../../components/dashboard/encabezado-panel";
import { COLUMNAS_CATEGORIA } from "../../../../../lib/catalogo/columnas";

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
    .select(COLUMNAS_CATEGORIA)
    .eq("negocio_id", negocio.id)
    .order("orden")
    .order("nombre");

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
        accion={<Link href="/dashboard/catalogo">Volver al catálogo</Link>}
        descripcion="Si ya llevás tu inventario en una planilla, no hace falta volver a escribirlo. Subí el archivo, decinos qué columna es cuál y revisá antes de crear."
        titulo="Importar tu Excel"
      />

      <ImportarPlanilla
        categorias={(categorias ?? []) as CategoriaCatalogo[]}
        negocioLlevaStock={negocioLlevaStock}
      />
    </main>
  );
}
