import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PanelApariencia } from "../../../../components/plantillas/panel-apariencia";
import { crearDatosDemoPlantilla } from "../../../../lib/plantillas/datos-demo";
import { esTipoNegocio } from "../../../../lib/modalidades";
import { leerBanners } from "../../../../lib/negocios/banners";
import { obtenerUrlPublicaImagenNegocio } from "../../../../lib/negocios/imagenes-publicas";
import { obtenerVariablesPublicasSupabase } from "../../../../lib/supabase/variables";
import { esPaletaId } from "../../../../lib/plantillas/validacion";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import styles from "./plantilla.module.css";
import { EncabezadoPanel } from "../../../../components/dashboard/encabezado-panel";
import { acotarOpacidad } from "../../../../lib/patrones-fondo";

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
    .select("nombre,descripcion,telefono_whatsapp,tipo_negocio,paleta_id,rubro,patron_fondo,patron_opacidad,subnombre,banners")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (!negocio) redirect("/dashboard/configuracion");

  const paletaInicial = esPaletaId(negocio.paleta_id) ? negocio.paleta_id : "mercado";

  /* La dirección de cada imagen se arma acá, en el servidor, que es quien conoce
     la del proyecto. Pasarle la regla al navegador sería repetirla en un segundo
     lugar y dejarla lista para desincronizarse. */
  const bannersGuardados = leerBanners(negocio.banners);
  const { url: urlSupabase } = obtenerVariablesPublicasSupabase();
  const urlPorRuta = Object.fromEntries(
    bannersGuardados.map((banner) => [
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
  });

  return (
    <main className={styles.contenido}>
      <EncabezadoPanel
        descripcion="Cambiala cuando quieras. No altera tus productos ni tus pedidos."
        titulo="Apariencia"
      />

      <PanelApariencia
        bannersIniciales={bannersGuardados}
        datos={datos}
        opacidadInicial={acotarOpacidad(negocio.patron_opacidad)}
        paletaInicial={paletaInicial}
        patronInicial={negocio.patron_fondo !== false}
        urlPorRuta={urlPorRuta}
      />
    </main>
  );
}
