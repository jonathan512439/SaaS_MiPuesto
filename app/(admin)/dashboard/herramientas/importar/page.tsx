import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ImportarPlanilla } from "../../../../../components/catalogo/importar-planilla";
import type { CategoriaCatalogo } from "../../../../../lib/catalogo/tipos";
import { crearClienteSupabaseServidor } from "../../../../../lib/supabase/server";
import { EncabezadoPanel } from "../../../../../components/dashboard/encabezado-panel";
import {
  COLUMNAS_ATRIBUTO_CATEGORIA,
  COLUMNAS_CATEGORIA,
} from "../../../../../lib/catalogo/columnas";
import { leerAtributos } from "../../../../../lib/catalogo/atributos";
import { nombreDeRubro, plantillasDelNegocio } from "../../../../../lib/importacion/plantillas";
import { RUTAS_PANEL, RUTA_SIN_NEGOCIO } from "../../../../../lib/panel/rutas";
import panel from "../../panel.module.css";

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
    /* El rubro y los secundarios deciden qué plantillas se ofrecen. */
    .select("id,rubro,rubro_publico,rubros_secundarios")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();
  if (!negocio) redirect(RUTA_SIN_NEGOCIO);

  /* Los campos de cada categoría, para guardar los datos que trae la planilla
     —«Color», «Potencia (W)»— en la categoría donde termine cada producto. */
  const [{ data: categorias }, { data: filasAtributos }] = await Promise.all([
    supabase
      .from("categorias")
      .select(COLUMNAS_CATEGORIA)
      .eq("negocio_id", negocio.id)
      .order("orden")
      .order("nombre"),
    supabase
      .from("atributos_categoria")
      .select(COLUMNAS_ATRIBUTO_CATEGORIA)
      .eq("negocio_id", negocio.id)
      .order("orden"),
  ]);
  const atributosPorCategoria: Record<string, ReturnType<typeof leerAtributos>> = {};
  for (const fila of filasAtributos ?? []) {
    (atributosPorCategoria[fila.categoria_id] ??= []).push(...leerAtributos([fila]));
  }

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
    <main className={panel.contenido}>
      <EncabezadoPanel
        accion={<Link href={RUTAS_PANEL.productos}>Ver mis productos</Link>}
        descripcion="Si ya llevás tu inventario en una planilla, no hace falta volver a escribirlo. Subí el archivo, decinos qué columna es cuál y revisá antes de crear."
        titulo="Importar tu Excel"
      />

      <ImportarPlanilla
        atributosPorCategoria={atributosPorCategoria}
        categorias={(categorias ?? []) as CategoriaCatalogo[]}
        negocioLlevaStock={negocioLlevaStock}
        plantillas={plantillasDelNegocio(negocio).map((rubro) => ({
          rubro,
          nombre: nombreDeRubro(rubro),
        }))}
      />
    </main>
  );
}
