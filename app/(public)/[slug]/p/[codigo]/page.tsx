import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { construirProductoPublico } from "../../../../../lib/catalogo/producto-publico";
import { formatearPrecioBolivianos } from "../../../../../lib/precios";
import { crearClienteSupabasePublico } from "../../../../../lib/supabase/public";
import { obtenerVariablesPublicasSupabase } from "../../../../../lib/supabase/variables";
import { construirUrlPublicaNegocio } from "../../../../../lib/url-sitio";
import temaStyles from "../../../../../components/templates/tema-catalogo.module.css";
import { esPaletaId } from "../../../../../lib/plantillas/validacion";
import styles from "./producto.module.css";

type PropiedadesPagina = {
  params: Promise<{ slug: string; codigo: string }>;
};

export const dynamic = "force-dynamic";

const obtenerProducto = cache(async (slug: string, codigo: string) => {
  const supabase = crearClienteSupabasePublico();
  const { data: negocio, error: errorNegocio } = await supabase
    .from("negocios")
    .select("id,slug,nombre,telefono_whatsapp,tipo_negocio,paleta_id")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();
  if (errorNegocio) throw new Error("No se pudo consultar el negocio.");
  if (!negocio) return null;

  const { data: producto, error: errorProducto } = await supabase
    .from("productos")
    .select(
      "id,codigo,nombre,descripcion,precio,fotos,estado,controla_stock,cantidad_stock,cantidad_reservada,categoria_id",
    )
    .eq("negocio_id", negocio.id)
    .eq("codigo", codigo)
    .eq("visible", true)
    .maybeSingle();
  if (errorProducto) throw new Error("No se pudo consultar el producto.");
  if (!producto) return null;

  const { data: promociones } = await supabase
    .from("promociones")
    .select("id,tipo,valor,producto_id,categoria_id,fecha_inicio,fecha_fin,activo,hora_inicio,hora_fin,dias")
    .eq("negocio_id", negocio.id);

  const { url } = obtenerVariablesPublicasSupabase();
  return {
    negocio,
    producto: construirProductoPublico(
      negocio,
      { ...producto, precio: Number(producto.precio) },
      url,
      new Date(),
      (promociones ?? []).map((promocion) => ({
        ...promocion,
        valor: Number(promocion.valor),
      })),
    ),
  };
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
  const urlProducto = `${construirUrlPublicaNegocio(negocio.slug)}/p/${producto.codigo}`;

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

  const { negocio, producto } = datos;
  const paleta = esPaletaId(negocio.paleta_id) ? negocio.paleta_id : "mercado";
  const agotado = producto.estado === "agotado" || producto.cantidadDisponible === 0;

  return (
    <main className={`${temaStyles.tema} ${styles.pagina}`} data-paleta={paleta}>
      <nav aria-label="Volver" className={styles.volver}>
        <Link href={`/${negocio.slug}`}>Volver al catálogo de {negocio.nombre}</Link>
      </nav>

      <article className={styles.producto}>
        <div className={styles.galeria}>
          {producto.imagenes.length ? (
            producto.imagenes.map((imagen, indice) => (
              <div className={styles.marco} key={imagen.src}>
                <Image
                  alt={imagen.alt}
                  fill
                  priority={indice === 0}
                  sizes="(min-width: 60rem) 540px, 100vw"
                  src={imagen.src}
                />
              </div>
            ))
          ) : (
            <div className={styles.marco}>
              <span className={styles.sinFoto}>Sin fotografía</span>
            </div>
          )}
        </div>

        <div className={styles.detalle}>
          <h1>{producto.nombre}</h1>

          <p className={styles.precio}>
            {producto.tienePromocion ? (
              <s>{formatearPrecioBolivianos(producto.precioOriginal)}</s>
            ) : null}
            <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
            {producto.tienePromocion ? <small>Precio promocional</small> : null}
          </p>

          {agotado ? (
            <p className={styles.agotado}>Sin unidades disponibles por ahora.</p>
          ) : producto.controlaStock && producto.cantidadDisponible !== null ? (
            <p className={styles.stock}>
              {producto.cantidadDisponible === 1
                ? "Queda 1 unidad"
                : `Quedan ${producto.cantidadDisponible} unidades`}
            </p>
          ) : null}

          {producto.descripcion ? (
            <p className={styles.descripcion}>{producto.descripcion}</p>
          ) : null}

          {producto.accionWhatsapp && !agotado ? (
            <a
              className={styles.accion}
              href={producto.accionWhatsapp}
              rel="noreferrer"
              target="_blank"
            >
              Consultar por WhatsApp
            </a>
          ) : null}

          <p className={styles.codigo}>Código {producto.codigo}</p>
        </div>
      </article>
    </main>
  );
}
