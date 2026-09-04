import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { CatalogoInteractivo } from "../../../components/catalogo/catalogo-interactivo";
import { obtenerNegocioPublicoCacheado } from "../../../lib/catalogo/negocio-cacheado";
import { construirCatalogoPublico } from "../../../lib/catalogo/publico";
import { crearClienteSupabasePublico } from "../../../lib/supabase/public";
import { obtenerVariablesPublicasSupabase } from "../../../lib/supabase/variables";
import { construirUrlPublicaNegocio } from "../../../lib/url-sitio";
import styles from "./catalogo-publico.module.css";

type PropiedadesPagina = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

/* cache() de React evita repetir la consulta entre generateMetadata y la
   pagina dentro de una misma peticion; unstable_cache la evita entre visitas. */
const obtenerNegocioPublico = cache((slug: string) => obtenerNegocioPublicoCacheado(slug));

export async function generateMetadata({ params }: PropiedadesPagina): Promise<Metadata> {
  const { slug } = await params;
  const negocio = await obtenerNegocioPublico(slug);

  if (!negocio) {
    return {
      title: "Catálogo no disponible | MiPuesto",
      description: "Este catálogo no está disponible por el momento.",
      robots: { index: false, follow: false },
    };
  }
  const urlCatalogo = construirUrlPublicaNegocio(negocio.slug);
  const descripcion = negocio.descripcion?.trim() || `Catálogo digital de ${negocio.nombre}.`;
  return {
    title: `${negocio.nombre} | MiPuesto`,
    description: descripcion,
    alternates: { canonical: urlCatalogo },
    openGraph: {
      type: "website",
      locale: "es_BO",
      siteName: "MiPuesto",
      title: negocio.nombre,
      description: descripcion,
      url: urlCatalogo,
    },
    twitter: {
      card: "summary_large_image",
      title: negocio.nombre,
      description: descripcion,
    },
  };
}

export default async function PaginaCatalogoPublico({ params }: PropiedadesPagina) {
  const { slug } = await params;
  const supabase = crearClienteSupabasePublico();
  const negocio = await obtenerNegocioPublico(slug);
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
