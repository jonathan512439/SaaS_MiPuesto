import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PanelApariencia } from "../../../../components/plantillas/panel-apariencia";
import { armarVistaPrevia } from "../../../../lib/plantillas/vista-previa-del-negocio";
import { obtenerVariablesPublicasSupabase } from "../../../../lib/supabase/variables";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import { EncabezadoPanel } from "../../../../components/dashboard/encabezado-panel";
import { COLUMNAS_DESTINO_PRODUCTO, COLUMNAS_VISTA_PREVIA_NEGOCIO } from "../../../../lib/catalogo/columnas";
import { construirUrlPublicaNegocio } from "../../../../lib/url-sitio";
import { RUTA_SIN_NEGOCIO } from "../../../../lib/panel/rutas";
import panel from "../panel.module.css";

export const metadata: Metadata = {
  title: "Plantilla del catálogo | MiPuesto",
  description: "Compara y elige la presentación visual de tu catálogo.",
};

export default async function PaginaPlantilla() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;

  if (!idUsuario) redirect("/login?motivo=sesion");

  const { data: negocio } = await supabase
    .from("negocios")
    .select(COLUMNAS_VISTA_PREVIA_NEGOCIO)
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (!negocio) redirect(RUTA_SIN_NEGOCIO);

  /* Las categorías visibles, para ofrecerlas como destino del botón de la portada. Se piden
     acá y no en el navegador: el formulario no tiene por qué conocer la forma de
     la tabla, y traerlas del servidor evita una consulta más al abrir la
     pantalla. */
  const [{ data: categorias }, { data: productos }] = await Promise.all([
    supabase
      .from("categorias")
      .select("id,nombre")
      .eq("negocio_id", negocio.id)
      .eq("visible", true)
      .order("orden"),
    /* Los productos visibles, para que el botón de la portada lleve a uno: «2x1 en
       hamburguesas» lleva a la hamburguesa y no al principio del catálogo. */
    supabase
      .from("productos")
      .select(COLUMNAS_DESTINO_PRODUCTO)
      .eq("negocio_id", negocio.id)
      .eq("visible", true)
      .is("eliminado_en", null)
      .order("nombre")
      .limit(1000),
  ]);

  const { url: urlSupabase } = obtenerVariablesPublicasSupabase();
  const vista = armarVistaPrevia(negocio, urlSupabase);

  return (
    <main className={panel.contenido}>
      <EncabezadoPanel
        descripcion="Colores, forma de los productos, fondo, logo y portada. Cámbiala cuando quieras."
        titulo="Apariencia"
      />

      <PanelApariencia
        destinos={{
          urlCatalogo: construirUrlPublicaNegocio(negocio.slug),
          telefonoWhatsapp: negocio.telefono_whatsapp,
          ubicacionUrl: negocio.ubicacion_url,
          categorias: categorias ?? [],
          productos: productos ?? [],
        }}
        negocioNombre={negocio.nombre}
        rutasImagenes={{ logo: negocio.logo_url, portada: negocio.portada_url }}
        urlSupabase={urlSupabase}
        vista={vista}
      />
    </main>
  );
}
