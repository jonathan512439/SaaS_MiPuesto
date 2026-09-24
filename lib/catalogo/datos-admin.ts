import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../supabase/database.types";
import {
  COLUMNAS_ATRIBUTO_CATEGORIA,
  COLUMNAS_CATEGORIA,
  COLUMNAS_PRODUCTO_ADMIN,
} from "./columnas";
import type {
  CategoriaCatalogo,
  DatosCatalogoAdmin,
  ProductoCatalogo,
  SubcategoriaCatalogo,
} from "./tipos";

/* Todo lo que las dos pantallas del catálogo necesitan para dibujarse.
 *
 * «Mi catálogo» y «Productos» son pantallas distintas y cargan **lo mismo**: las
 * dos las atiende el mismo componente, que comparte estado —crear una categoría
 * tiene que aparecer al instante en el desplegable del formulario de producto—.
 *
 * Que la consulta viva acá y no copiada en cada página es lo que evita que un
 * día una de las dos traiga una columna que la otra no, y que el mismo negocio
 * se vea distinto según por dónde se entró.
 */
function consultarAtributos(supabase: SupabaseClient<Database>, negocioId: string) {
  /* Las definiciones de campos de todas las categorías, juntas. El formulario de
     producto tiene que dibujar los de la categoría elegida al instante en que se
     elige: pedirlas recién ahí dejaría el bloque vacío un momento cada vez que el
     dueño cambia el desplegable. */
  return supabase
    .from("atributos_categoria")
    .select(COLUMNAS_ATRIBUTO_CATEGORIA)
    .eq("negocio_id", negocioId)
    .order("orden");
}

function consultarRecursos(supabase: SupabaseClient<Database>, negocioId: string) {
  return supabase
    .from("recursos")
    /* La duración de su turno viene con él: el formulario del producto la
       muestra como omisión, y sin el número ahí poner otra es una decisión a
       ciegas. */
    .select("id,nombre,activo,agenda_recurso(duracion_minutos)")
    .eq("negocio_id", negocioId)
    .order("orden")
    .order("nombre");
}

export async function leerCatalogoAdmin(
  supabase: SupabaseClient<Database>,
  idUsuario: string,
): Promise<DatosCatalogoAdmin | null> {
  const { data: negocio } = await supabase
    .from("negocios")
    /* `foto_ia_habilitada` la necesita el formulario de producto, no esta
       pantalla: es la que decide si aparece «Completá los campos con una foto».
       Se cayó de esta consulta al separar Herramientas —donde vive la otra
       herramienta de IA, la que lee una lista entera— y el bloque desapareció
       sin que nada avisara, porque el campo era opcional en el tipo. */
    /* `rubro_publico` y `rubros_secundarios`, para que las ayudas del
       catálogo hablen del oficio del negocio (`guias-por-rubro.ts`). */
    .select("id,nombre,slug,rubro,rubro_publico,rubros_secundarios,foto_ia_habilitada,plan_id")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();
  if (!negocio) return null;

  const [categorias, atributos, recursos, subcategorias, productos, usoIa] = await Promise.all([
    supabase
      .from("categorias")
      .select(COLUMNAS_CATEGORIA)
      .eq("negocio_id", negocio.id)
      .order("orden")
      .order("nombre"),
    consultarAtributos(supabase, negocio.id),
    consultarRecursos(supabase, negocio.id),
    supabase
      .from("subcategorias")
      .select("id,categoria_id,nombre,orden,categorias!inner(negocio_id)")
      .eq("categorias.negocio_id", negocio.id)
      .order("orden")
      .order("nombre"),
    supabase
      .from("productos")
      .select(COLUMNAS_PRODUCTO_ADMIN)
      .eq("negocio_id", negocio.id)
      .is("eliminado_en", null)
      .order("orden")
      .order("creado_en"),
    /* El mes se guarda como su día 1, en hora de Bolivia. Si el negocio todavía
       no usó la herramienta este mes no hay fila, y eso es cero. */
    supabase
      .from("uso_ia_negocio")
      .select("cantidad")
      .eq("negocio_id", negocio.id)
      .eq("mes", `${new Date().toISOString().slice(0, 8)}01`)
      .maybeSingle(),
  ]);

  return {
    negocio,
    categorias: (categorias.data ?? []) as CategoriaCatalogo[],
    /* Se deja afuera el `categorias!inner` que sirvió para filtrar por negocio:
       es un dato de la consulta, no de la subcategoría. */
    subcategorias: (subcategorias.data ?? []).map(({ id, categoria_id, nombre, orden }) => ({
      id,
      categoria_id,
      nombre,
      orden,
    })) as SubcategoriaCatalogo[],
    productos: (productos.data ?? []) as ProductoCatalogo[],
    atributos: atributos.data ?? [],
    recursos: recursos.data ?? [],
    fotosUsadasMes: usoIa.data?.cantidad ?? 0,
  };
}
