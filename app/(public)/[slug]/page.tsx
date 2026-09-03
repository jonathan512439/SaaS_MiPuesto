import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { CatalogoInteractivo } from "../../../components/catalogo/catalogo-interactivo";
import { construirCatalogoPublico } from "../../../lib/catalogo/publico";
import { obtenerUrlPublicaImagenNegocio } from "../../../lib/negocios/imagenes-publicas";
import { crearClienteSupabasePublico } from "../../../lib/supabase/public";
import { obtenerVariablesPublicasSupabase } from "../../../lib/supabase/variables";
import { construirUrlPublicaNegocio } from "../../../lib/url-sitio";
import styles from "./catalogo-publico.module.css";

type PropiedadesPagina = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

const obtenerNegocioPublico = cache(async (slug: string) => {
  const supabase = crearClienteSupabasePublico();
  const { data, error } = await supabase
    .from("negocios")
    .select(
      "id,slug,nombre,descripcion,tipo_negocio,telefono_whatsapp,horario,plantilla_id,paleta_id,logo_url,portada_url,qr_pago_url,redes_sociales,activo",
    )
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();
  if (error) throw new Error("No se pudo consultar el negocio público.");
  return data;
});

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
  const { url } = obtenerVariablesPublicasSupabase();
  const imagenConfigurada = obtenerUrlPublicaImagenNegocio(
    url,
    negocio.portada_url ?? negocio.logo_url,
  );
  const urlCatalogo = construirUrlPublicaNegocio(negocio.slug);
  const descripcion = negocio.descripcion?.trim() || `Catálogo digital de ${negocio.nombre}.`;
  const imagen = imagenConfigurada ?? `${urlCatalogo}/opengraph-image`;
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
      images: [{ url: imagen, alt: `Catálogo de ${negocio.nombre}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: negocio.nombre,
      description: descripcion,
      images: [imagen],
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
