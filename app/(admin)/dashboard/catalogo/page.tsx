import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GestorCatalogo } from "../../../../components/catalogo/gestor-catalogo";
import type {
  CategoriaCatalogo,
  ProductoCatalogo,
  SubcategoriaCatalogo,
} from "../../../../lib/catalogo/tipos";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import { obtenerVariablesPublicasSupabase } from "../../../../lib/supabase/variables";
import styles from "./catalogo.module.css";
import { COLUMNAS_PRODUCTO_ADMIN } from "../../../../lib/catalogo/columnas";
import { EncabezadoPanel } from "../../../../components/dashboard/encabezado-panel";
import { COLUMNAS_CATEGORIA } from "../../../../lib/catalogo/columnas";
import { RUTA_SIN_NEGOCIO } from "../../../../lib/panel/rutas";

export const metadata: Metadata = {
  title: "Catálogo | MiPuesto",
  description: "Organiza categorías, productos, existencias y fotografías de tu catálogo.",
};

export default async function PaginaCatalogo() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login?motivo=sesion");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("id,nombre,slug,rubro")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();
  if (!negocio) redirect(RUTA_SIN_NEGOCIO);

  const [
    resultadoCategorias,
    resultadoAtributos,
    resultadoRecursos,
    resultadoSubcategorias,
    resultadoProductos,
  ] = await Promise.all([
    supabase
      .from("categorias")
      .select(COLUMNAS_CATEGORIA)
      .eq("negocio_id", negocio.id)
      .order("orden")
      .order("nombre"),
    /* Las definiciones de campos de todas las categorías, juntas. El formulario
       de producto tiene que dibujar los de la categoría elegida al instante en
       que se elige: pedirlas recién ahí dejaría el bloque vacío un momento cada
       vez que el dueño cambia el desplegable. */
    supabase
      .from("atributos_categoria")
      .select(
        "categoria_id,clave,nombre,tipo,unidad,opciones,obligatorio,en_tarjeta,en_resumen,orden",
      )
      .eq("negocio_id", negocio.id)
      .order("orden"),
    supabase
      .from("recursos")
      .select("id,nombre,activo")
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
      .select(COLUMNAS_PRODUCTO_ADMIN)
      .eq("negocio_id", negocio.id)
      .is("eliminado_en", null)
      .order("orden")
      .order("creado_en"),
  ]);
  const subcategorias = (resultadoSubcategorias.data ?? []).map(
    ({ id, categoria_id, nombre, orden }) => ({ id, categoria_id, nombre, orden }),
  );
  const { url } = obtenerVariablesPublicasSupabase();

  return (
    <main className={styles.contenido}>
      <EncabezadoPanel
        descripcion="Gestioná tus productos y mantené tu negocio siempre al día."
        titulo="Catálogo"
      />

      <GestorCatalogo
        datosIniciales={{
          negocio,
          categorias: (resultadoCategorias.data ?? []) as CategoriaCatalogo[],
          subcategorias: subcategorias as SubcategoriaCatalogo[],
          productos: (resultadoProductos.data ?? []) as ProductoCatalogo[],
          atributos: resultadoAtributos.data ?? [],
          recursos: resultadoRecursos.data ?? [],
        }}
        urlSupabase={url}
      />
    </main>
  );
}
