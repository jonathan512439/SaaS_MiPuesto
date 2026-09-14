import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormularioBanners } from "../../../../components/negocios/formulario-banners";
import { SelectorApariencia } from "../../../../components/plantillas/selector-apariencia";
import { crearDatosDemoPlantilla } from "../../../../lib/plantillas/datos-demo";
import { esTipoNegocio } from "../../../../lib/modalidades";
import { tarjetaValidaPara } from "../../../../lib/apariencia";
import { leerBanners } from "../../../../lib/negocios/banners";
import { obtenerUrlPublicaImagenNegocio } from "../../../../lib/negocios/imagenes-publicas";
import { obtenerVariablesPublicasSupabase } from "../../../../lib/supabase/variables";
import { esPaletaId, esPlantillaId } from "../../../../lib/plantillas/validacion";
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
    .select("nombre,descripcion,telefono_whatsapp,tipo_negocio,plantilla_id,tarjeta_id,paleta_id,rubro,patron_fondo,patron_opacidad,subnombre,banners")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (!negocio) redirect("/dashboard/configuracion");

  const plantillaInicial = esPlantillaId(negocio.plantilla_id)
    ? negocio.plantilla_id
    : "clasica";
  const paletaInicial = esPaletaId(negocio.paleta_id) ? negocio.paleta_id : "mercado";
  /* Se corrige acá también, y no solo al guardar: un negocio anterior a esta
     columna llega con la predeterminada, y uno que cambió de plantilla por SQL
     podría llegar con una forma que su plantilla no dibuja. */
  const tarjetaInicial = tarjetaValidaPara(plantillaInicial, negocio.tarjeta_id);

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

      <SelectorApariencia
        datos={datos}
        paletaInicial={paletaInicial}
        tarjetaInicial={tarjetaInicial}
        opacidadInicial={acotarOpacidad(negocio.patron_opacidad)}
        patronInicial={negocio.patron_fondo !== false}
        plantillaInicial={plantillaInicial}
      />

      <FormularioBanners bannersIniciales={bannersGuardados} urlPorRuta={urlPorRuta} />
    </main>
  );
}
