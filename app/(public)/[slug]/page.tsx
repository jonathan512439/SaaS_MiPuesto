import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogoInteractivo } from "../../../components/catalogo/catalogo-interactivo";
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
      "id,slug,nombre,descripcion,tipo_negocio,telefono_whatsapp,horario,plantilla_id,paleta_id,logo_url,portada_url,qr_pago_url,redes_sociales,activo",
    )
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();
  if (!negocio) notFound();

  const [resultadoCategorias, resultadoSubcategorias, resultadoProductos, resultadoPromociones] = await Promise.all([
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
        "id,codigo,categoria_id,subcategoria_id,nombre,descripcion,precio,fotos,controla_stock,cantidad_stock,cantidad_reservada,estado,visible,orden",
      )
      .eq("negocio_id", negocio.id)
      .eq("visible", true)
      .order("orden")
      .order("creado_en"),
    supabase
      .from("promociones")
      .select("id,tipo,valor,producto_id,categoria_id,fecha_inicio,fecha_fin,activo")
      .eq("negocio_id", negocio.id),
  ]);
  if (
    resultadoCategorias.error ||
    resultadoSubcategorias.error ||
    resultadoProductos.error ||
    resultadoPromociones.error
  ) {
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
    new Date(),
    (resultadoPromociones.data ?? []).map((promocion) => ({
      ...promocion,
      valor: Number(promocion.valor),
    })),
  );
  return (
    <main className={styles.pagina}>
      <div className={styles.catalogo}>
        <CatalogoInteractivo
          datos={catalogo.datos}
          paleta={catalogo.paleta}
          plantilla={catalogo.plantilla}
        />
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
