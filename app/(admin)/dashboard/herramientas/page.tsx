import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EncabezadoPanel } from "../../../../components/dashboard/encabezado-panel";
import { Icono, type NombreIcono } from "../../../../components/iconos/icono";
import { esAvisoDeFotoReciente } from "../../../../lib/ia/ayuda";
import { rubroOfrece } from "../../../../lib/negocios/rubros";
import { RUTAS_PANEL, RUTA_SIN_NEGOCIO } from "../../../../lib/panel/rutas";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import styles from "./herramientas.module.css";

export const metadata: Metadata = {
  title: "Herramientas | MiPuesto",
  description: "Importar, imprimir, recuperar productos y cargar tu lista con una fotografía.",
};

/* Las herramientas del panel, en su propia pantalla.
 *
 * Vivían apretadas en una fila de botones chicos arriba de «Mi catálogo», que es
 * la pantalla que más se usa y donde menos lugar había. Ahí no entraba lo único
 * que un dueño necesita saber de una herramienta que nunca usó: **qué hace**.
 * «Importar mi Excel o CSV» no le dice a nadie que puede cargar cien productos
 * de una vez sin escribirlos uno por uno.
 *
 * Cada una aparece solo cuando sirve —la papelera si hay algo que recuperar, el
 * menú impreso si el rubro lo usa, la lectura con IA si la plataforma se la
 * habilitó—, así que esta pantalla no es la misma para dos negocios distintos.
 */
type Herramienta = {
  href: string;
  titulo: string;
  /* Qué hace, en una frase y en las palabras del dueño. Sin esto la pantalla
     sería una lista de nombres que hay que abrir para entender. */
  explicacion: string;
  icono: NombreIcono;
  externa?: boolean;
  /* Una descarga, no una pantalla. Va con una etiqueta `a` común y no con el
     enlace de Next: el enrutador del navegador intenta resolver el destino como
     una pantalla, y esto no lo es —devuelve un archivo—. Con `a` el navegador
     hace lo único que hay que hacer: pedirlo y guardarlo. */
  descarga?: boolean;
};

export default async function PaginaHerramientas() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login?motivo=sesion");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("id,slug,rubro,foto_ia_habilitada,foto_ia_habilitada_en")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();
  if (!negocio) redirect(RUTA_SIN_NEGOCIO);

  /* Solo el número: la papelera se abre pocas veces, y traer sus filas acá sería
     peso en cada visita para una pantalla que casi nadie mira. */
  const { count } = await supabase
    .from("productos")
    .select("id", { count: "exact", head: true })
    .eq("negocio_id", negocio.id)
    .not("eliminado_en", "is", null);
  const enPapelera = count ?? 0;

  const avisarFotoNueva =
    negocio.foto_ia_habilitada === true && esAvisoDeFotoReciente(negocio.foto_ia_habilitada_en);

  const herramientas: Herramienta[] = [
    {
      href: RUTAS_PANEL.importar,
      titulo: "Importar una planilla",
      explicacion:
        "Si ya tenés tus productos en un Excel o un CSV, los cargás todos de una vez en lugar de escribirlos uno por uno.",
      icono: "grafico",
    },
    {
      /* Una ruta de la API y no una pantalla: es un enlace que descarga.
         Conviene que el dueño sepa que existe **antes** de necesitarla: quien
         descubre que puede llevarse su catálogo recién el día que quiere irse ya
         perdió la confianza que esto venía a dar. */
      href: "/api/catalogo/exportar",
      descarga: true,
      titulo: "Descargar mi catálogo",
      explicacion:
        "Una planilla con tus productos, sus precios y sus categorías. Te la podés llevar, o volver a cargarla acá si alguna vez necesitás rehacer el catálogo.",
      icono: "carpeta",
    },
  ];

  /* Solo para los rubros a los que les sirve: un menú impreso en una boutique es
     un botón que nadie va a tocar nunca. */
  if (rubroOfrece(negocio.rubro, "menu_imprimible")) {
    herramientas.push({
      href: `/${negocio.slug}/imprimir`,
      titulo: "Menú para imprimir",
      explicacion:
        "Tu catálogo en una hoja, listo para imprimir y dejar en la mesa o pegar en la vidriera.",
      icono: "documento",
      externa: true,
    });
  }

  /* Aparece recién cuando hay algo adentro: una papelera vacía anunciada en cada
     visita es ruido, y peor, hace dudar de si se borró algo sin querer. */
  if (enPapelera > 0) {
    herramientas.push({
      href: RUTAS_PANEL.papelera,
      titulo: `Papelera (${enPapelera})`,
      explicacion:
        "Lo que borraste sigue acá un tiempo. Si borraste algo sin querer, se recupera desde esta pantalla.",
      icono: "carpeta",
    });
  }

  return (
    <main className={styles.contenido}>
      <EncabezadoPanel
        descripcion="Cosas que vas a usar de vez en cuando: cargar muchos productos juntos, imprimir tu menú o recuperar lo borrado."
        titulo="Herramientas"
      />

      {avisarFotoNueva ? (
        <aside className={styles.avisoFoto}>
          <h2>Ya podés cargar tu catálogo con una foto</h2>
          <p>
            Habilitamos dos cosas en tu cuenta: fotografiar tu lista de precios para crear
            varios productos de una vez, y completar el nombre y la descripción de un
            producto con su fotografía. El precio lo ponés siempre vos.
          </p>
          <Link href={RUTAS_PANEL.desdeFoto}>Probar con mi lista de precios</Link>
        </aside>
      ) : null}

      {/* La de IA va aparte y primero, con su propio trato: es la única función
          que cuesta dinero cada vez que se usa y la única que hace algo que el
          dueño no podría hacer solo. Los tres pasos van a la vista y no detrás
          del clic, porque la pregunta que frena a alguien no es «qué hace» sino
          «qué me va a pedir». */}
      {negocio.foto_ia_habilitada ? (
        <section aria-labelledby="titulo-ia" className={styles.tarjetaIa}>
          <div className={styles.tarjetaIaCuerpo}>
            <span className={styles.selloIa}>Herramienta con IA</span>
            <h2 id="titulo-ia">Cargá tu catálogo desde la foto o el PDF de tu lista de precios</h2>
            <ol className={styles.pasosIa}>
              <li>
                <b>1</b> Sacale una foto a tu lista, o subí el PDF del proveedor
              </li>
              <li>
                <b>2</b> Revisás y corregís lo que leyó
              </li>
              <li>
                <b>3</b> Confirmás y se crean los productos
              </li>
            </ol>
            <Link className={styles.abrirIa} href={RUTAS_PANEL.desdeFoto}>
              Abrir la herramienta
            </Link>
          </div>
        </section>
      ) : null}

      <ul className={styles.lista}>
        {herramientas.map(({ descarga, explicacion, externa, href, icono, titulo }) => (
          <li className={styles.tarjeta} key={href}>
            <Icono className={styles.iconoHerramienta} nombre={icono} />
            <h2>
              {descarga ? (
                <a href={href}>{titulo}</a>
              ) : (
                <Link
                  href={href}
                  rel={externa ? "noreferrer" : undefined}
                  target={externa ? "_blank" : undefined}
                >
                  {titulo}
                </Link>
              )}
            </h2>
            <p>{explicacion}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
