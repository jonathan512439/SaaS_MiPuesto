import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { COLUMNAS_PRODUCTO_PUBLICO } from "../../../../../lib/catalogo/columnas";
import { obtenerNegocioPublico } from "../../../../../lib/catalogo/negocio-publico";
import { consultarContextoPublico } from "../../../../../lib/catalogo/pagina-publica";
import { construirCatalogoPublico } from "../../../../../lib/catalogo/publico";
import { Icono } from "../../../../../components/iconos/icono";
import { ProductoConPedido } from "../../../../../components/catalogo/producto-con-pedido";
import { formatearPrecioBolivianos } from "../../../../../lib/precios";
import { crearClienteSupabasePublico } from "../../../../../lib/supabase/public";
import { obtenerVariablesPublicasSupabase } from "../../../../../lib/supabase/variables";
import { construirUrlPublicaProducto } from "../../../../../lib/url-sitio";
import temaStyles from "../../../../../components/templates/tema-catalogo.module.css";
import styles from "./producto.module.css";

type PropiedadesPagina = {
  params: Promise<{ slug: string; codigo: string }>;
};

export const dynamic = "force-dynamic";

/* El producto, armado **con el mismo constructor que el catálogo**.
 *
 * Antes tenía el suyo, y por eso esta página sabía menos que la hoja que se
 * abre al tocar el mismo producto: no dibujaba las presentaciones ni los datos
 * de su categoría. Quien recibía el enlace no podía elegir la talla que su
 * vecino sí veía.
 *
 * Dos constructores del mismo producto son, a la larga, dos precios del mismo
 * producto: alcanza con que una promoción se aplique en uno y no en el otro. Así
 * que se le pasa **un solo producto** al constructor del catálogo y se saca de
 * ahí; el costo es leer las mismas tablas auxiliares, que son chicas.
 */
const obtenerProducto = cache(async (slug: string, codigo: string) => {
  const negocio = await obtenerNegocioPublico(slug);
  if (!negocio) return null;

  const supabase = crearClienteSupabasePublico();
  const { data: producto, error: errorProducto } = await supabase
    .from("productos")
    .select(COLUMNAS_PRODUCTO_PUBLICO)
    .eq("negocio_id", negocio.id)
    .eq("codigo", codigo)
    .eq("visible", true)
    .maybeSingle();
  if (errorProducto) throw new Error("No se pudo consultar el producto.");
  if (!producto) return null;

  const [categorias, variantes, atributos, subcategorias, promociones] =
    await consultarContextoPublico(supabase, negocio.id);

  const { url } = obtenerVariablesPublicasSupabase();
  const { datos, paleta } = construirCatalogoPublico(
    negocio,
    categorias.data ?? [],
    (subcategorias.data ?? []).map(({ id, categoria_id, nombre, orden }) => ({
      id,
      categoria_id,
      nombre,
      orden,
    })),
    [producto],
    url,
    new Date(),
    (promociones.data ?? []).map((promocion) => ({
      ...promocion,
      valor: Number(promocion.valor),
    })),
    atributos.data ?? [],
    variantes.data ?? [],
  );

  /* El constructor devuelve el catálogo agrupado; acá dentro hay un solo
     producto, así que se lo busca sin importar en qué categoría cayó. */
  const armado = datos.categorias
    .flatMap((categoria) => [
      ...categoria.productos,
      ...(categoria.subcategorias ?? []).flatMap((sub) => sub.productos),
    ])
    .find((item) => item.codigo === codigo);
  if (!armado) return null;

  /* La paleta la devuelve el constructor aparte del negocio: es del catálogo y
     no del negocio, y en el tipo del catálogo no viaja adentro. */
  return { negocio: datos.negocio, producto: armado, paleta };
});


export async function generateMetadata({ params }: PropiedadesPagina): Promise<Metadata> {
  const { slug, codigo } = await params;
  const datos = await obtenerProducto(slug, codigo);

  if (!datos) {
    return {
      title: "Producto no disponible | MiPuesto",
      robots: { index: false, follow: false },
    };
  }

  const { negocio, producto } = datos;
  const titulo = `${producto.nombre} | ${negocio.nombre}`;
  const descripcion =
    producto.descripcion.trim() ||
    `${producto.nombre} a ${formatearPrecioBolivianos(producto.precio)} en ${negocio.nombre}.`;
  const urlProducto = construirUrlPublicaProducto(negocio.slug, producto.codigo);

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: urlProducto },
    openGraph: {
      type: "website",
      locale: "es_BO",
      siteName: "MiPuesto",
      title: `${producto.nombre}, ${formatearPrecioBolivianos(producto.precio)}`,
      description: descripcion,
      url: urlProducto,
    },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion },
  };
}

export default async function PaginaProducto({ params }: PropiedadesPagina) {
  const { slug, codigo } = await params;
  const datos = await obtenerProducto(slug, codigo);
  if (!datos) notFound();

  const { negocio, producto, paleta } = datos;

  return (
    <main className={`${temaStyles.tema} ${styles.pagina}`} data-paleta={paleta}>
      {/* La cabecera de las referencias: la flecha sola a la izquierda y el
          rótulo de la pantalla al medio.
          Decía «Volver al catálogo de Pollos Broaster Saolito», que en un
          teléfono ocupaba dos renglones para explicar un gesto que nadie
          necesita que le expliquen. El nombre del negocio, además, ya está
          arriba de todo apenas se toca la flecha. */}
      <header className={styles.barra}>
        <Link aria-label={`Volver al catálogo de ${negocio.nombre}`} href={`/${negocio.slug}`}>
          <Icono nombre="atras" />
        </Link>
        <h2>Detalle del producto</h2>
      </header>

      <article className={styles.producto}>
        <ProductoConPedido
          modalidad={negocio.modalidad}
          negocioId={negocio.id}
          permiteAcciones={negocio.atencion.permiteAcciones}
          producto={producto}
          slug={negocio.slug}
        />
      </article>
    </main>
  );
}
