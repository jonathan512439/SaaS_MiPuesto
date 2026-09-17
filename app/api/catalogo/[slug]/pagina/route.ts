import { NextResponse, type NextRequest } from "next/server";

import { COLUMNAS_CATEGORIA } from "../../../../../lib/catalogo/columnas";
import { calcularTotalPaginas, leerFiltrosCatalogo } from "../../../../../lib/catalogo/consulta-publica";
import { obtenerNegocioPublico } from "../../../../../lib/catalogo/negocio-publico";
import {
  consultarContextoPublico,
  consultarProductosPublicos,
} from "../../../../../lib/catalogo/pagina-publica";
import { construirCatalogoPublico } from "../../../../../lib/catalogo/publico";
import { crearClienteSupabasePublico } from "../../../../../lib/supabase/public";
import { obtenerVariablesPublicasSupabase } from "../../../../../lib/supabase/variables";

/* El tramo siguiente del catálogo, para cuando el visitante sigue bajando.
 *
 * La pantalla sirve el primer tramo ya dibujado, con sus enlaces de «Anterior» y
 * «Siguiente» adentro del HTML. Esto no los reemplaza: los **adelanta**. Mientras
 * el visitante lee, el navegador pide lo que viene y lo agrega abajo; si no hay
 * JavaScript, o si alguien comparte el enlace de la página tres, los enlaces
 * siguen ahí y siguen funcionando.
 *
 * Por eso esta ruta devuelve exactamente lo mismo que la pantalla dibuja: las
 * categorías ya agrupadas, con sus subgrupos y sus precios resueltos. Devolver
 * productos crudos obligaría al navegador a repetir el agrupado, las
 * promociones y las presentaciones, y ese cálculo ya existe y está probado de
 * este lado.
 *
 * Lee con la clave pública y solo productos visibles, igual que la pantalla: es
 * la misma información que ya sirve el catálogo, no una puerta nueva.
 */
export async function GET(
  solicitud: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const negocio = await obtenerNegocioPublico(slug);
  if (!negocio) {
    return NextResponse.json({ error: "Ese catálogo no existe." }, { status: 404 });
  }

  const supabase = crearClienteSupabasePublico();
  const parametros = Object.fromEntries(solicitud.nextUrl.searchParams.entries());

  /* Las categorías se piden antes de leer los filtros por el mismo motivo que en
     la pantalla: una categoría que no es de este negocio se descarta, y para
     saberlo hay que conocer las suyas. */
  const { data: categoriasDelNegocio } = await supabase
    .from("categorias")
    .select(COLUMNAS_CATEGORIA)
    .eq("negocio_id", negocio.id)
    .order("orden")
    .order("nombre");

  const filtros = leerFiltrosCatalogo(parametros, categoriasDelNegocio ?? []);

  const [contexto, productos] = await Promise.all([
    consultarContextoPublico(supabase, negocio.id),
    consultarProductosPublicos(
      supabase,
      negocio.id,
      { ...parametros, pagina: String(filtros.pagina) },
      filtros.categoria,
    ),
  ]);

  const [categorias, variantes, atributos, subcategorias, promociones] = contexto;

  if (categorias.error || productos.error) {
    return NextResponse.json({ error: "No se pudo cargar el catálogo." }, { status: 500 });
  }

  const { url } = obtenerVariablesPublicasSupabase();
  const { datos } = construirCatalogoPublico(
    negocio,
    categorias.data ?? [],
    (subcategorias.data ?? []).map(({ id, categoria_id, nombre, orden }) => ({
      id,
      categoria_id,
      nombre,
      orden,
    })),
    productos.data ?? [],
    url,
    new Date(),
    (promociones.data ?? []).map((promocion) => ({
      ...promocion,
      valor: Number(promocion.valor),
    })),
    atributos.data ?? [],
    variantes.data ?? [],
  );

  return NextResponse.json({
    categorias: datos.categorias,
    totalPaginas: calcularTotalPaginas(productos.count ?? 0),
  });
}
