import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GestorCatalogo } from "../../../../components/catalogo/gestor-catalogo";
import type {
  CategoriaCatalogo,
  ProductoCatalogo,
  SubcategoriaCatalogo,
} from "../../../../lib/catalogo/tipos";
import { esAvisoDeFotoReciente } from "../../../../lib/ia/ayuda";
import { rubroOfrece } from "../../../../lib/negocios/rubros";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import { obtenerVariablesPublicasSupabase } from "../../../../lib/supabase/variables";
import styles from "./catalogo.module.css";
import { COLUMNAS_PRODUCTO_ADMIN } from "../../../../lib/catalogo/columnas";

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
    .select("id,nombre,slug,rubro,foto_ia_habilitada,foto_ia_habilitada_en")
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
      .select(COLUMNAS_PRODUCTO_ADMIN)
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
  const avisarFotoNueva =
    negocio.foto_ia_habilitada === true &&
    esAvisoDeFotoReciente(negocio.foto_ia_habilitada_en);

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
        {/* Aparece recién cuando la plataforma se la habilitó: es la única
            función que cuesta dinero cada vez que se usa. */}
        {negocio.foto_ia_habilitada ? (
          <section aria-labelledby="titulo-ia" className={styles.tarjetaIa}>
            <div className={styles.tarjetaIaCuerpo}>
              <span className={styles.selloIa}>Herramienta con IA</span>
              <h2 id="titulo-ia">Cargá tu catálogo desde una foto de tu lista de precios</h2>
              <ol className={styles.pasosIa}>
                <li>
                  <b>1</b> Sacale una foto a tu lista de precios
                </li>
                <li>
                  <b>2</b> Revisás y corregís lo que leyó
                </li>
                <li>
                  <b>3</b> Confirmás y se crean los productos
                </li>
              </ol>
              <Link className={styles.abrirIa} href="/dashboard/catalogo/desde-foto">
                Abrir la herramienta
              </Link>
            </div>
          </section>
        ) : null}
        {/* Solo para los rubros a los que les sirve: un menú impreso en una
            boutique es un botón que nadie va a tocar nunca. */}
        {rubroOfrece(negocio.rubro, "menu_imprimible") ? (
          <Link
            className={styles.enlacePapelera}
            href={`/${negocio.slug}/imprimir`}
            rel="noreferrer"
            target="_blank"
          >
            Menú para imprimir
          </Link>
        ) : null}
        {enPapelera > 0 ? (
          <Link className={styles.enlacePapelera} href="/dashboard/catalogo/papelera">
            Papelera ({enPapelera})
          </Link>
        ) : null}
      </header>

      {avisarFotoNueva ? (
        <aside className={styles.avisoFoto}>
          <h2>Ya podés cargar tu catálogo con una foto</h2>
          <p>
            Habilitamos dos cosas en tu cuenta: fotografiar tu lista de precios para crear
            varios productos de una vez, y completar el nombre y la descripción de un
            producto con su fotografía. El precio lo ponés siempre vos.
          </p>
          <Link href="/dashboard/catalogo/desde-foto">Probar con mi lista de precios</Link>
        </aside>
      ) : null}

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
