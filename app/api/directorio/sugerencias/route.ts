import { NextResponse, type NextRequest } from "next/server";

import { buscarEnDirectorio, leerFiltrosDirectorio } from "../../../../lib/directorio";
import { rutaProductoPublico } from "../../../../lib/url-sitio";

/* Las sugerencias del buscador, mientras se escribe. Fase 12, rediseño.
 *
 * Es la misma función de la base que la búsqueda completa —las mismas reglas:
 * solo negocios que eligieron aparecer, solo lo visible, nunca coordenadas—,
 * recortada a lo que entra en una lista desplegable: cinco negocios y sus
 * productos.
 *
 * **No anota búsquedas sin resultado.** Mientras se escribe, «jug» no
 * encuentra nada y no es una búsqueda: es media palabra. Se anota solo lo que el
 * cliente envía.
 */
export async function GET(solicitud: NextRequest) {
  const parametros = Object.fromEntries(solicitud.nextUrl.searchParams.entries());
  const filtros = leerFiltrosDirectorio({ q: parametros.q, ciudad: parametros.ciudad });
  if (filtros.texto.length < 2) {
    return NextResponse.json({ negocios: [], productos: [] });
  }

  try {
    const { resultados } = await buscarEnDirectorio({ ...filtros, pagina: 1 });
    const negocios = resultados.slice(0, 5);
    return NextResponse.json(
      {
        negocios: negocios.map((negocio) => ({
          slug: negocio.slug,
          nombre: negocio.nombre,
          rubro: negocio.rubro,
          zona: negocio.zona,
          logoUrl: negocio.logoUrl,
          abierto: negocio.estadoAtencion.abierto === true,
          enlace: negocio.palabra
            ? `/${negocio.slug}?buscar=${encodeURIComponent(negocio.palabra)}`
            : `/${negocio.slug}`,
        })),
        productos: negocios
          .flatMap((negocio) =>
            negocio.productos.map((producto) => ({
              nombre: producto.nombre,
              negocio: negocio.nombre,
              fotoUrl: producto.fotoUrl,
              enlace: rutaProductoPublico(negocio.slug, producto.codigo),
            })),
          )
          .slice(0, 6),
      },
      /* Unos segundos alcanzan: dos personas que escriben lo mismo piden lo
         mismo, y lo que cambia en un catálogo no cambia en treinta segundos. */
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  } catch {
    return NextResponse.json({ negocios: [], productos: [] }, { status: 503 });
  }
}
