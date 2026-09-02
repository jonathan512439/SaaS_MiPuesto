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
    .select("id,nombre,slug")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();
  if (!negocio) redirect("/dashboard/configuracion");

  const [resultadoCategorias, resultadoSubcategorias, resultadoProductos] = await Promise.all([
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
      .from("productos")
      .select(
        "id,categoria_id,subcategoria_id,nombre,descripcion,precio,fotos,controla_stock,cantidad_stock,visible,estado,orden",
      )
      .eq("negocio_id", negocio.id)
      .order("orden")
      .order("creado_en"),
  ]);

  const subcategorias = (resultadoSubcategorias.data ?? []).map(
    ({ id, categoria_id, nombre, orden }) => ({ id, categoria_id, nombre, orden }),
  );
  const { url } = obtenerVariablesPublicasSupabase();

  return (
    <main className={styles.contenido}>
      <header className={styles.encabezado}>
        <p>Productos del negocio</p>
        <h1>Organiza tu catálogo</h1>
        <p>
          Crea categorías para que tus clientes encuentren rápido lo que buscan. Puedes ocultar
          un producto sin borrarlo y cambiar toda esta información cuando lo necesites.
        </p>
      </header>

      <GestorCatalogo
        datosIniciales={{
          negocio,
          categorias: (resultadoCategorias.data ?? []) as CategoriaCatalogo[],
          subcategorias: subcategorias as SubcategoriaCatalogo[],
          productos: (resultadoProductos.data ?? []) as ProductoCatalogo[],
        }}
        urlSupabase={url}
      />
    </main>
  );
}
