import type { Metadata } from "next";
import Link from "next/link";
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

  const [
    resultadoCategorias,
    resultadoSubcategorias,
    resultadoProductos,
    resultadoPapelera,
  ] = await Promise.all([
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
        "id,codigo,categoria_id,subcategoria_id,nombre,descripcion,precio,precio_anterior,precio_actualizado_en,precio_actualizado_por,fotos,controla_stock,cantidad_stock,cantidad_reservada,visible,estado,orden",
      )
      .eq("negocio_id", negocio.id)
      .is("eliminado_en", null)
      .order("orden")
      .order("creado_en"),
    /* Solo el número: la papelera se abre pocas veces y traer sus filas acá
       sería peso en cada carga del catálogo para una pantalla que casi nadie
       visita. */
    supabase
      .from("productos")
      .select("id", { count: "exact", head: true })
      .eq("negocio_id", negocio.id)
      .not("eliminado_en", "is", null),
  ]);
  const enPapelera = resultadoPapelera.count ?? 0;

  const subcategorias = (resultadoSubcategorias.data ?? []).map(
    ({ id, categoria_id, nombre, orden }) => ({ id, categoria_id, nombre, orden }),
  );
  const { url } = obtenerVariablesPublicasSupabase();

  return (
    <main className={styles.contenido}>
      <header className={styles.encabezado}>
        <h1>Catálogo</h1>
        {/* El enlace aparece solo cuando hay algo que recuperar: una papelera
            vacía anunciada en cada visita es ruido. */}
        {enPapelera > 0 ? (
          <Link className={styles.enlacePapelera} href="/dashboard/catalogo/papelera">
            Papelera ({enPapelera})
          </Link>
        ) : null}
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
