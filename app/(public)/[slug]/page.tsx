import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  PlantillaClasica,
  PlantillaMinimal,
  PlantillaModerna,
} from "../../../components/templates";
import { construirCatalogoPublico } from "../../../lib/catalogo/publico";
import { crearClienteSupabasePublico } from "../../../lib/supabase/public";
import { obtenerVariablesPublicasSupabase } from "../../../lib/supabase/variables";
import styles from "./catalogo-publico.module.css";

type PropiedadesPagina = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PropiedadesPagina): Promise<Metadata> {
  const { slug } = await params;
  const supabase = crearClienteSupabasePublico();
  const { data: negocio } = await supabase
    .from("negocios")
    .select("nombre,descripcion")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();

  if (!negocio) return { title: "Catálogo no disponible | MiPuesto" };
  return {
    title: `${negocio.nombre} | MiPuesto`,
    description: negocio.descripcion ?? `Catálogo digital de ${negocio.nombre}.`,
  };
}

export default async function PaginaCatalogoPublico({ params }: PropiedadesPagina) {
  const { slug } = await params;
  const supabase = crearClienteSupabasePublico();
  const { data: negocio } = await supabase
    .from("negocios")
    .select(
      "id,nombre,descripcion,tipo_negocio,telefono_whatsapp,horario,plantilla_id,paleta_id,activo",
    )
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();
  if (!negocio) notFound();

  const [resultadoCategorias, resultadoSubcategorias, resultadoProductos] = await Promise.all([
    supabase
      .from("categorias")
      .select("id,nombre,orden")
      .eq("negocio_id", negocio.id)
      .order("orden")
      .order("nombre"),
    supabase
      .from("subcategorias")
      .select("id,categoria_id,nombre,orden,categorias!inner(negocio_id)")
      .eq("categorias.negocio_id", negocio.id)
      .order("orden")
      .order("nombre"),
    supabase
      .from("productos")
      .select(
        "id,categoria_id,subcategoria_id,nombre,descripcion,precio,fotos,estado,visible,orden",
      )
      .eq("negocio_id", negocio.id)
      .eq("visible", true)
      .order("orden")
      .order("creado_en"),
  ]);
  if (resultadoCategorias.error || resultadoSubcategorias.error || resultadoProductos.error) {
    throw new Error("No se pudo cargar el catálogo público.");
  }
  const subcategorias = (resultadoSubcategorias.data ?? []).map(
    ({ id, categoria_id, nombre, orden }) => ({ id, categoria_id, nombre, orden }),
  );
  const { url } = obtenerVariablesPublicasSupabase();
  const catalogo = construirCatalogoPublico(
    negocio,
    resultadoCategorias.data ?? [],
    subcategorias,
    resultadoProductos.data ?? [],
    url,
  );
  const Plantilla =
    catalogo.plantilla === "moderna"
      ? PlantillaModerna
      : catalogo.plantilla === "minimal"
        ? PlantillaMinimal
        : PlantillaClasica;

  return (
    <main className={styles.pagina}>
      <div className={styles.catalogo}>
        <Plantilla datos={catalogo.datos} demostracion={false} paleta={catalogo.paleta} />
        {catalogo.datos.categorias.length === 0 ? (
          <section className={styles.vacio} aria-labelledby="catalogo-vacio">
            <h2 id="catalogo-vacio">El catálogo se está preparando</h2>
            <p>Este negocio todavía no publicó productos. Puedes consultarle por WhatsApp.</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
