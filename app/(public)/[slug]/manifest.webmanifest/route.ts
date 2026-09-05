import { obtenerNegocioPublico } from "../../../../lib/catalogo/negocio-publico";
import { COLORES_MIPUESTO } from "../../../../lib/identidad-visual";
import { obtenerUrlPublicaImagenNegocio } from "../../../../lib/negocios/imagenes-publicas";
import { obtenerVariablesPublicasSupabase } from "../../../../lib/supabase/variables";

export const dynamic = "force-dynamic";

/* Un manifiesto por negocio para que «agregar a la pantalla de inicio» deje el
 * catálogo del comerciante y no el directorio de MiPuesto: quien guarda el
 * enlace de su tienda de barrio quiere abrir esa tienda, con su nombre y su
 * logotipo, no una aplicación nuestra.
 *
 * No lleva `theme_color` de la paleta elegida a propósito: los colores de las
 * paletas viven en el CSS y copiarlos acá crearía una segunda fuente de verdad,
 * que es exactamente el error que dejó a Feria sin publicar. Se usa el color de
 * MiPuesto, que no depende de nada.
 */
export async function GET(
  _solicitud: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const negocio = await obtenerNegocioPublico(slug);

  if (!negocio) {
    return new Response("No encontrado", { status: 404 });
  }

  const { url } = obtenerVariablesPublicasSupabase();
  const logo = obtenerUrlPublicaImagenNegocio(url, negocio.logo_url ?? null, "logo");
  const iconos = logo
    ? [{ src: logo, sizes: "192x192", type: "image/jpeg", purpose: "any" as const }]
    : [{ src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" as const }];

  const manifiesto = {
    name: negocio.nombre,
    short_name: negocio.nombre.slice(0, 12),
    description: negocio.descripcion?.trim() || `Catálogo de ${negocio.nombre}.`,
    start_url: `/${slug}`,
    scope: `/${slug}`,
    display: "standalone",
    background_color: COLORES_MIPUESTO.superficie,
    theme_color: COLORES_MIPUESTO.marca,
    lang: "es-BO",
    icons: iconos,
  };

  return Response.json(manifiesto, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
