import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { CatalogoInteractivo } from "../../../components/catalogo/catalogo-interactivo";
import {
  calcularRango,
  calcularTotalPaginas,
  construirRutaCatalogo,
  extraerTerminos,
  leerFiltrosCatalogo,
} from "../../../lib/catalogo/consulta-publica";
import { obtenerNegocioPublicoCacheado } from "../../../lib/catalogo/negocio-cacheado";
import { construirCatalogoPublico } from "../../../lib/catalogo/publico";
import { crearClienteSupabasePublico } from "../../../lib/supabase/public";
import { obtenerVariablesPublicasSupabase } from "../../../lib/supabase/variables";
import { construirUrlPublicaNegocio } from "../../../lib/url-sitio";
import styles from "./catalogo-publico.module.css";

type PropiedadesPagina = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

/* PostgREST usa este código cuando el desplazamiento pedido supera las filas
   disponibles. */
function esRangoFueraDeAlcance(error: { code?: string } | null) {
  return error?.code === "PGRST103";
}

export default async function PaginaCatalogoPublico({
  params,
  searchParams,
}: PropiedadesPagina) {
  const { slug } = await params;
  const supabase = crearClienteSupabasePublico();
  const negocio = await obtenerNegocioPublico(slug);
  if (!negocio) notFound();

  /* Las categorías se piden primero porque el filtro se valida contra ellas: un
     identificador inventado en la dirección tiene que caer a «todo» y no
     devolver un catálogo vacío. */
  const [resultadoCategorias, resultadoSubcategorias, resultadoPromociones] =
    await Promise.all([
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
        .from("promociones")
        .select("id,tipo,valor,producto_id,categoria_id,fecha_inicio,fecha_fin,activo")
        .eq("negocio_id", negocio.id),
    ]);

  const categorias = resultadoCategorias.data ?? [];
  const filtros = leerFiltrosCatalogo(await searchParams, categorias);
  const terminos = extraerTerminos(filtros.busqueda);
  const { desde, hasta } = calcularRango(filtros.pagina);

  /* Filtrar y paginar aquí, y no en el navegador, es lo que permite un catálogo
     de trescientos productos: antes viajaba la ficha completa de cada uno en
     cada visita para mostrar doce. */
  let consultaProductos = supabase
    .from("productos")
    .select(
      "id,codigo,categoria_id,subcategoria_id,nombre,descripcion,precio,fotos,controla_stock,cantidad_stock,cantidad_reservada,estado,visible,orden",
      { count: "exact" },
    )
    .eq("negocio_id", negocio.id)
    .eq("visible", true);

  if (filtros.categoria) {
    consultaProductos = consultaProductos.eq("categoria_id", filtros.categoria);
  }
  for (const termino of terminos) {
    consultaProductos = consultaProductos.ilike("texto_busqueda", `%${termino}%`);
  }

  const resultadoProductos = await consultaProductos
    .order("orden")
    .order("creado_en")
    .range(desde, hasta);

  /* Pedir un tramo que no existe no es un fallo del catálogo sino una dirección
     vieja: pasa cuando alguien comparte el enlace de la página cuatro y el
     negocio da de baja productos. PostgREST lo responde como rango inválido, y
     la respuesta correcta es corregir la dirección, no mostrar un error. */
  if (esRangoFueraDeAlcance(resultadoProductos.error)) {
    let consultaTotal = supabase
      .from("productos")
      .select("id", { count: "exact", head: true })
      .eq("negocio_id", negocio.id)
      .eq("visible", true);
    if (filtros.categoria) consultaTotal = consultaTotal.eq("categoria_id", filtros.categoria);
    for (const termino of terminos) {
      consultaTotal = consultaTotal.ilike("texto_busqueda", `%${termino}%`);
    }

    const { count } = await consultaTotal;
    redirect(
      construirRutaCatalogo(slug, {
        ...filtros,
        pagina: calcularTotalPaginas(count ?? 0),
      }),
    );
  }

  if (
    resultadoCategorias.error ||
    resultadoSubcategorias.error ||
    resultadoProductos.error ||
    resultadoPromociones.error
  ) {
    throw new Error("No se pudo cargar el catálogo público.");
  }

  const totalProductos = resultadoProductos.count ?? 0;
  const totalPaginas = calcularTotalPaginas(totalProductos);
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
          categoriasNavegacion={categorias.map(({ id, nombre }) => ({ id, nombre }))}
          datos={catalogo.datos}
          filtros={filtros}
          paleta={catalogo.paleta}
          plantilla={catalogo.plantilla}
          slug={slug}
          totalPaginas={totalPaginas}
          totalProductos={totalProductos}
        />
        {categorias.length === 0 && totalProductos === 0 ? (
          <section className={styles.vacio} aria-labelledby="catalogo-vacio">
            <h2 id="catalogo-vacio">El catálogo se está preparando</h2>
            <p>Este negocio todavía no publicó productos. Puedes consultarle por WhatsApp.</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
