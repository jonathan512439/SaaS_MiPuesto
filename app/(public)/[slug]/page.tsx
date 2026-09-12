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
import { obtenerNegocioPublico as consultarNegocioPublico } from "../../../lib/catalogo/negocio-publico";
import {
  categoriasParaNavegar,
  construirCatalogoPublico,
} from "../../../lib/catalogo/publico";
import { esUuid } from "../../../lib/catalogo/validacion";
import { crearClienteSupabasePublico } from "../../../lib/supabase/public";
import { obtenerVariablesPublicasSupabase } from "../../../lib/supabase/variables";
import { construirUrlPublicaNegocio } from "../../../lib/url-sitio";
import styles from "./catalogo-publico.module.css";
import { COLUMNAS_PRODUCTO_PUBLICO } from "../../../lib/catalogo/columnas";
import { COLUMNAS_CATEGORIA } from "../../../lib/catalogo/columnas";

type PropiedadesPagina = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

/* cache() de React evita repetir la consulta entre generateMetadata y la
   pagina dentro de una misma peticion; unstable_cache la evita entre visitas. */
const obtenerNegocioPublico = cache((slug: string) => consultarNegocioPublico(slug));

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
    /* Su propio manifiesto: guardar el catálogo en el inicio del teléfono tiene
       que dejar la tienda del comerciante, no el directorio de MiPuesto. */
    manifest: `/${negocio.slug}/manifest.webmanifest`,
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

function leerCategoriaPedida(parametros: Record<string, string | string[] | undefined>) {
  const valor = parametros.categoria;
  const pedida = (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? "";
  return esUuid(pedida) ? pedida : "";
}


/* Filtrar y paginar aquí, y no en el navegador, es lo que permite un catálogo
   de trescientos productos: antes viajaba la ficha completa de cada uno en cada
   visita para mostrar doce. */
function consultarProductos(
  supabase: ReturnType<typeof crearClienteSupabasePublico>,
  negocioId: string,
  parametros: Record<string, string | string[] | undefined>,
  categoria: string,
) {
  const filtros = leerFiltrosCatalogo(parametros, []);
  const { desde, hasta } = calcularRango(filtros.pagina);

  let consulta = supabase
    .from("productos")
    .select(COLUMNAS_PRODUCTO_PUBLICO, { count: "exact" })
    .eq("negocio_id", negocioId)
    .eq("visible", true);

  if (categoria) consulta = consulta.eq("categoria_id", categoria);
  for (const termino of extraerTerminos(filtros.busqueda)) {
    consulta = consulta.ilike("texto_busqueda", `%${termino}%`);
  }

  return consulta.order("orden").order("creado_en").range(desde, hasta);
}

export default async function PaginaCatalogoPublico({
  params,
  searchParams,
}: PropiedadesPagina) {
  const { slug } = await params;
  const supabase = crearClienteSupabasePublico();
  const negocio = await obtenerNegocioPublico(slug);
  if (!negocio) notFound();

  /* Todo en un solo viaje. Los productos se piden con el filtro tal como llegó
     en la dirección, comprobando solo su forma; si después resulta que esa
     categoría no es de este negocio, se vuelve a preguntar sin filtro. Esperar
     a las categorías para validar costaba un viaje entero en cada visita, y el
     caso que lo justificaba es una dirección manipulada. */
  const parametros = await searchParams;
  const categoriaPedida = leerCategoriaPedida(parametros);

  /* Un solo reloj para toda la página. Además de contentar a la regla de pureza,
     evita que la ventana de cupos y la fecha con la que se arma el catálogo
     difieran por unos milisegundos y muestren cosas distintas. */
  const ahora = new Date();

  const [
    resultadoCategorias,
    resultadoAgendas,
    resultadoCupos,
    resultadoVariantes,
    resultadoAtributos,
    resultadoSubcategorias,
    resultadoPromociones,
    resultadoOptimista,
  ] = await Promise.all([
      supabase
        .from("categorias")
        .select(COLUMNAS_CATEGORIA)
        .eq("negocio_id", negocio.id)
        .order("orden")
        .order("nombre"),
      /* Las definiciones de campos de todas las categorías, en una sola
         consulta. Son diez filas por categoría como mucho, y el catálogo las
         necesita todas: pedirlas por categoría serían cuarenta viajes para
         dibujar una página. */
      /* Las agendas del negocio y los cupos ya tomados. Con las dos, el catálogo
         calcula el próximo turno libre de cada servicio y lo muestra en su
         tarjeta: sin esto la disponibilidad solo se ve entrando a la ficha, que
         es lo contrario de para qué sirve un calendario. */
      supabase
        .from("agenda_categoria")
        .select(
          "categoria_id,duracion_minutos,cupo_por_franja,anticipacion_minima_horas,dias_maximos,franjas",
        )
        .eq("negocio_id", negocio.id),
      supabase.rpc("cupos_tomados_negocio", {
        p_negocio_id: negocio.id,
        p_desde: ahora.toISOString(),
        p_hasta: new Date(ahora.getTime() + 31 * 86_400_000).toISOString(),
      }),
      /* Las presentaciones de todos los productos del negocio, en una consulta.
         Se filtran las ocultas al agrupar, no acá, para que el conteo del
         catálogo no dependa de dos lugares. */
      supabase
        .from("variantes_producto")
        .select("id,producto_id,nombre,precio,cantidad_stock,visible,orden")
        .eq("negocio_id", negocio.id)
        .order("orden"),
      supabase
        .from("atributos_categoria")
        .select(
          "categoria_id,clave,nombre,tipo,unidad,opciones,en_tarjeta,en_resumen,orden",
        )
        .eq("negocio_id", negocio.id)
        .order("orden"),
      supabase
        .from("subcategorias")
        .select("id,categoria_id,nombre,orden,categorias!inner(negocio_id)")
        .eq("categorias.negocio_id", negocio.id)
        .order("orden")
        .order("nombre"),
      supabase
        .from("promociones")
        .select("id,tipo,valor,producto_id,categoria_id,fecha_inicio,fecha_fin,activo,hora_inicio,hora_fin,dias")
        .eq("negocio_id", negocio.id),
      consultarProductos(supabase, negocio.id, parametros, categoriaPedida),
    ]);

  const categorias = resultadoCategorias.data ?? [];
  const filtros = leerFiltrosCatalogo(parametros, categorias);

  /* La consulta optimista sirve salvo que la dirección traiga una categoría que
     no es de este negocio: ahí se rehace sin filtro, para que el visitante vea
     el catálogo entero y no una página vacía. */
  const resultadoProductos =
    categoriaPedida && !filtros.categoria
      ? await consultarProductos(supabase, negocio.id, parametros, "")
      : resultadoOptimista;

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
    for (const termino of extraerTerminos(filtros.busqueda)) {
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
    ahora,
    (resultadoPromociones.data ?? []).map((promocion) => ({
      ...promocion,
      valor: Number(promocion.valor),
    })),
    resultadoAtributos.data ?? [],
    resultadoVariantes.data ?? [],
    resultadoAgendas.data ?? [],
    resultadoCupos.data ?? [],
  );
  return (
    <main className={styles.pagina}>
      <div className={styles.catalogo}>
        <CatalogoInteractivo
          categoriasNavegacion={categoriasParaNavegar(categorias)}
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
