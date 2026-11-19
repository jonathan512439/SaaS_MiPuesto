import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { obtenerNegocioPublico } from "../../../../lib/catalogo/negocio-publico";
import { construirCatalogoPublico } from "../../../../lib/catalogo/publico";
import { formatearPrecioBolivianos, tienePrecio } from "../../../../lib/precios";
import type { ProductoPlantilla } from "../../../../lib/plantillas/tipos";
import { crearClienteSupabasePublico } from "../../../../lib/supabase/public";
import { obtenerVariablesPublicasSupabase } from "../../../../lib/supabase/variables";
import styles from "./menu-imprimible.module.css";
import { COLUMNAS_PRODUCTO_IMPRESO } from "../../../../lib/catalogo/columnas";
import { COLUMNAS_CATEGORIA } from "../../../../lib/catalogo/columnas";

export const dynamic = "force-dynamic";

/* Un menú impreso no se pagina: se imprime entero o no sirve. El tope existe
   para que un catálogo desmedido no tumbe la página, no para recortar a nadie:
   el plan más grande admite 300 productos (`lib/planes.ts`). */
const TOPE_PRODUCTOS = 500;

type PropiedadesPagina = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PropiedadesPagina): Promise<Metadata> {
  const { slug } = await params;
  const negocio = await obtenerNegocioPublico(slug);
  if (!negocio) return { title: "Menú no disponible" };
  return {
    title: `Menú de ${negocio.nombre}`,
    description: `Lista de precios de ${negocio.nombre} para imprimir.`,
    /* Es la misma información que el catálogo, en otra forma. Indexarla sería
       competir contra la propia página del negocio. */
    robots: { index: false, follow: false },
  };
}

export default async function PaginaMenuImprimible({ params }: PropiedadesPagina) {
  const { slug } = await params;
  const negocio = await obtenerNegocioPublico(slug);
  if (!negocio) notFound();

  const supabase = crearClienteSupabasePublico();
  const [resultadoCategorias, resultadoSubcategorias, resultadoProductos] = await Promise.all([
    supabase
      .from("categorias")
      .select(COLUMNAS_CATEGORIA)
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
      .select(COLUMNAS_PRODUCTO_IMPRESO)
      .eq("negocio_id", negocio.id)
      .eq("visible", true)
      .order("orden")
      .order("creado_en")
      .limit(TOPE_PRODUCTOS),
  ]);

  const { url } = obtenerVariablesPublicasSupabase();
  const { datos } = construirCatalogoPublico(
    negocio,
    resultadoCategorias.data ?? [],
    (resultadoSubcategorias.data ?? []).map(({ id, categoria_id, nombre, orden }) => ({
      id,
      categoria_id,
      nombre,
      orden,
    })),
    resultadoProductos.data ?? [],
    url,
  );

  /* Si ningún producto tiene precio, la hoja no habla de precios. */
  const hayPrecios = datos.categorias.some((categoria) =>
    [...categoria.productos, ...(categoria.subcategorias ?? []).flatMap(({ productos }) => productos)].some(
      ({ precio }) => tienePrecio(precio),
    ),
  );

  const impreso = new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <main className={styles.hoja}>
      <header className={styles.encabezado}>
        <h1>{datos.negocio.nombre}</h1>
        {datos.negocio.descripcion ? <p>{datos.negocio.descripcion}</p> : null}
        <p className={styles.contacto}>
          WhatsApp {datos.negocio.telefonoWhatsapp}
          {hayPrecios ? " · Precios en bolivianos" : null}
        </p>
      </header>

      {datos.categorias.length === 0 ? (
        <p>Este catálogo todavía no tiene productos publicados.</p>
      ) : (
        datos.categorias.map((categoria) => (
          <section className={styles.categoria} key={categoria.id}>
            <h2>{categoria.nombre}</h2>
            <ul className={styles.lista}>
              {categoria.productos.map((producto) => (
                <RenglonImpreso key={producto.id} producto={producto} />
              ))}
            </ul>

            {categoria.subcategorias?.map((subcategoria) => (
              <div key={subcategoria.id}>
                <h3>{subcategoria.nombre}</h3>
                <ul className={styles.lista}>
                  {subcategoria.productos.map((producto) => (
                    <RenglonImpreso key={producto.id} producto={producto} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))
      )}

      {/* La fecha es del día en que se imprime, y va a propósito: una lista de
          precios sin fecha sigue circulando meses después de que los precios
          cambiaron. */}
      <footer className={styles.pie}>
        <p>Precios al {impreso}. Sujetos a cambio.</p>
        <p>Catálogo completo en mipuesto.app/{datos.negocio.slug || slug}</p>
      </footer>
    </main>
  );
}

/* Un renglón de la hoja: el nombre, la guía de puntos y el precio. Sin precio
   (fase 14), el nombre solo: sin guía que lleve a nada y sin guion. */
function RenglonImpreso({ producto }: { producto: ProductoPlantilla }) {
  return (
    <li>
      <span className={styles.nombre}>{producto.nombre}</span>
      {tienePrecio(producto.precio) ? (
        <>
          <span aria-hidden="true" className={styles.guia} />
          <span className={styles.precio}>{formatearPrecioBolivianos(Number(producto.precio))}</span>
        </>
      ) : null}
    </li>
  );
}
