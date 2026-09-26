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
import panel from "../panel.module.css";

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
        "Si ya tienes tus productos en un Excel o un CSV, los cargas todos de una vez en lugar de escribirlos uno por uno.",
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
        "Una planilla con tus productos, sus precios y sus categorías. Te la puedes llevar, o volver a cargarla acá si alguna vez necesitas rehacer el catálogo.",
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
    <main className={panel.contenido}>
      <EncabezadoPanel
        descripcion="Cosas que vas a usar de vez en cuando: cargar muchos productos juntos, imprimir tu menú o recuperar lo borrado."
        titulo="Herramientas"
      />

      {/* La de IA va aparte y primero, con su propio trato: es la única función
          que cuesta dinero cada vez que se usa y la única que hace algo que el
          dueño no podría hacer solo. Los tres pasos van a la vista y no detrás
          del clic, porque la pregunta que frena a alguien no es «qué hace» sino
          «qué me va a pedir».
          El aviso de «recién habilitada» va adentro de la tarjeta y sin botón
          propio. Era un recuadro aparte con «Probar con mi lista de precios»
          encima de «Abrir la herramienta»: dos botones seguidos al mismo lugar,
          que el dueño leía como dos formas distintas de subir su lista. */}
      {negocio.foto_ia_habilitada ? (
        <section aria-labelledby="titulo-ia" className={styles.tarjetaIa}>
          <div className={styles.tarjetaIaCuerpo}>
            <span className={styles.selloIa}>
              {avisarFotoNueva ? "Nuevo en tu cuenta · Herramienta con IA" : "Herramienta con IA"}
            </span>
            <h2 id="titulo-ia">Carga tu catálogo desde la foto o el PDF de tu lista de precios</h2>
            {avisarFotoNueva ? (
              <p className={styles.nuevaIa}>
                También completa el nombre y la descripción de un producto con su fotografía, desde
                Productos. El precio lo pones siempre vos.
              </p>
            ) : null}
            <ol className={styles.pasosIa}>
              <li>
                <b>1</b> Sácale una foto a tu lista, o sube el PDF del proveedor
              </li>
              <li>
                <b>2</b> Revisas y corriges lo que leyó
              </li>
              <li>
                <b>3</b> Confirmas y se crean los productos
              </li>
            </ol>
            <Link className={styles.abrirIa} href={RUTAS_PANEL.desdeFoto}>
              Abrir la herramienta
            </Link>
            {/* Las dos herramientas cargan muchos productos juntos, y desde
                afuera parecen la misma. La diferencia es el archivo: acá va una
                foto o un PDF; un Excel va a «Importar una planilla», que lo lee
                tal cual y no gasta lecturas. */}
            <p className={styles.notaIa}>
              ¿Ya tienes tus productos en Excel o CSV? Usa <strong>Importar una planilla</strong>,
              más abajo: es gratis y no gasta lecturas.
            </p>
          </div>
        </section>
      ) : null}

      <ul className={styles.lista}>
        {herramientas.map(({ descarga, explicacion, externa, href, icono, titulo }) => (
          /* Se toca la tarjeta entera, no el nombre.
             Antes el único destino era el título: una tarjeta grande con un
             renglón subrayado adentro se lee como un recuadro informativo que
             además tiene un enlace, y no como una opción que se elige. Y en un
             teléfono obliga a apuntarle a dos palabras teniendo la tarjeta
             entera disponible.
             La descarga va con `a` común y no con el enlace de Next: el
             enrutador intenta resolver el destino como una pantalla, y un
             archivo no lo es. */
          <li key={href}>
            {descarga ? (
              <a className={styles.tarjeta} href={href}>
                <Icono className={styles.iconoHerramienta} nombre={icono} />
                <h2>{titulo}</h2>
                <p>{explicacion}</p>
                <Icono aria-hidden="true" className={styles.flecha} nombre="flechaArriba" />
              </a>
            ) : (
              <Link
                className={styles.tarjeta}
                href={href}
                rel={externa ? "noreferrer" : undefined}
                target={externa ? "_blank" : undefined}
              >
                <Icono className={styles.iconoHerramienta} nombre={icono} />
                <h2>{titulo}</h2>
                <p>{explicacion}</p>
                <Icono aria-hidden="true" className={styles.flecha} nombre="flechaArriba" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
