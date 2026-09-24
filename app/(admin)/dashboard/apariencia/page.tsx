import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PanelApariencia } from "../../../../components/plantillas/panel-apariencia";
import { crearDatosDemoPlantilla } from "../../../../lib/plantillas/datos-demo";
import { esTipoNegocio } from "../../../../lib/modalidades";
import { leerBanners } from "../../../../lib/negocios/banners";
import { leerTextoPortada } from "../../../../lib/negocios/texto-sobre-imagen";
import { obtenerUrlPublicaImagenNegocio } from "../../../../lib/negocios/imagenes-publicas";
import { obtenerVariablesPublicasSupabase } from "../../../../lib/supabase/variables";
import { esPaletaId } from "../../../../lib/plantillas/validacion";
import { FORMA_TARJETA_POR_OMISION, esFormaTarjeta } from "../../../../lib/apariencia";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import { EncabezadoPanel } from "../../../../components/dashboard/encabezado-panel";
import { acotarOpacidad } from "../../../../lib/patrones-fondo";
import { construirUrlPublicaNegocio } from "../../../../lib/url-sitio";
import { RUTA_SIN_NEGOCIO } from "../../../../lib/panel/rutas";
import panel from "../panel.module.css";

export const metadata: Metadata = {
  title: "Plantilla del catálogo | MiPuesto",
  description: "Compará y elegí la presentación visual de tu catálogo.",
};

export default async function PaginaPlantilla() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;

  if (!idUsuario) redirect("/login?motivo=sesion");

  const { data: negocio } = await supabase
    .from("negocios")
    .select(
      "id,slug,nombre,descripcion,telefono_whatsapp,tipo_negocio,paleta_id,rubro,patron_fondo,patron_opacidad,subnombre,ubicacion_url,banners,portada_url,portada_texto,forma_tarjeta",
    )
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (!negocio) redirect(RUTA_SIN_NEGOCIO);

  const paletaInicial = esPaletaId(negocio.paleta_id) ? negocio.paleta_id : "mercado";
  const formaInicial = esFormaTarjeta(negocio.forma_tarjeta)
    ? negocio.forma_tarjeta
    : FORMA_TARJETA_POR_OMISION;

  /* La dirección de cada imagen se arma acá, en el servidor, que es quien conoce
     la del proyecto. Pasarle la regla al navegador sería repetirla en un segundo
     lugar y dejarla lista para desincronizarse. */
  /* Las categorías visibles, para ofrecerlas como destino del banner. Se piden
     acá y no en el navegador: el formulario no tiene por qué conocer la forma de
     la tabla, y traerlas del servidor evita una consulta más al abrir la
     pantalla. */
  const { data: categorias } = await supabase
    .from("categorias")
    .select("id,nombre")
    .eq("negocio_id", negocio.id)
    .eq("visible", true)
    .order("orden");

  const bannersGuardados = leerBanners(negocio.banners);
  const portadaGuardada = leerTextoPortada(negocio.portada_texto);
  const { url: urlSupabase } = obtenerVariablesPublicasSupabase();
  const urlPorRuta = Object.fromEntries(
    /* Los lugares vacíos no tienen imagen que resolver. */
    bannersGuardados
      .filter((banner) => banner !== null)
      .map((banner) => [
        banner.imagen,
        obtenerUrlPublicaImagenNegocio(urlSupabase, banner.imagen, "banner") ?? "",
      ]),
  );
  const datos = crearDatosDemoPlantilla({
    nombre: negocio.nombre,
    descripcion: negocio.descripcion,
    telefonoWhatsapp: negocio.telefono_whatsapp,
    tipoNegocio: esTipoNegocio(negocio.tipo_negocio)
      ? negocio.tipo_negocio
      : "catalogo_estatico",
    rubro: negocio.rubro,
    patronFondo: negocio.patron_fondo !== false,
    patronOpacidad: acotarOpacidad(negocio.patron_opacidad),
    subnombre: negocio.subnombre?.trim() || null,
    /* La portada de verdad, para que la muestra dibuje el texto donde va a
       quedar y no sobre una foto inventada. */
    portadaUrl: obtenerUrlPublicaImagenNegocio(urlSupabase, negocio.portada_url, "portada"),
    portadaTexto: portadaGuardada,
    formaTarjeta: formaInicial,
  });

  return (
    <main className={panel.contenido}>
      <EncabezadoPanel
        descripcion="Cambiala cuando quieras."
        titulo="Apariencia"
      />

      <PanelApariencia
        bannersIniciales={bannersGuardados}
        portadaInicial={portadaGuardada}
        destinos={{
          urlCatalogo: construirUrlPublicaNegocio(negocio.slug),
          telefonoWhatsapp: negocio.telefono_whatsapp,
          ubicacionUrl: negocio.ubicacion_url,
          categorias: categorias ?? [],
        }}
        datos={datos}
        formaInicial={formaInicial}
        opacidadInicial={acotarOpacidad(negocio.patron_opacidad)}
        paletaInicial={paletaInicial}
        patronInicial={negocio.patron_fondo !== false}
        urlPorRuta={urlPorRuta}
      />
    </main>
  );
}
