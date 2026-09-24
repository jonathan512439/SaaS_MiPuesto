import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  FormularioIdentidad,
  type IdentidadNegocioInicial,
} from "../../../../components/negocios/formulario-identidad";
import {
  FormularioNegocio,
  type PerfilNegocioInicial,
} from "../../../../components/negocios/formulario-negocio";
import {
  FormularioOperacion,
  type OperacionNegocioInicial,
} from "../../../../components/negocios/formulario-operacion";
import { CodigoQrNegocio } from "../../../../components/negocios/codigo-qr-negocio";
import { QueVendesYDonde } from "../../../../components/negocios/que-vendes-y-donde";
import { PasoNumerado } from "../../../../components/dashboard/paso-numerado";
import { leerPresenciaDelNegocio } from "../../../../lib/negocios/presencia-pagina";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import { obtenerVariablesPublicasSupabase } from "../../../../lib/supabase/variables";
import { construirUrlPublicaNegocio } from "../../../../lib/url-sitio";
import styles from "./negocio.module.css";
import { EncabezadoPanel } from "../../../../components/dashboard/encabezado-panel";
import panel from "../panel.module.css";

export const metadata: Metadata = {
  title: "Configuración del negocio | MiPuesto",
  description: "Datos básicos y modalidad del catálogo MiPuesto.",
};

export default async function PaginaConfiguracion() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;

  if (!idUsuario) redirect("/login?motivo=sesion");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("nombre,slug,descripcion,subnombre,rubro_bloqueado_en,tipo_negocio,telefono_whatsapp,horario,reserva_minutos,logo_url,portada_url,qr_pago_url,redes_sociales,ubicacion_url,resenas_url,rubro,pide_numero_mesa")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  const { url } = obtenerVariablesPublicasSupabase();
  const presencia = negocio ? await leerPresenciaDelNegocio(supabase, idUsuario) : null;

  return (
    <main className={panel.contenido}>
      <EncabezadoPanel
        descripcion="Configura la información de tu negocio para que tus clientes te encuentren en el catálogo."
        titulo={negocio ? "Tu negocio" : "Crea el perfil de tu negocio"}
      />

      <div className={styles.rejilla}>
        <FormularioNegocio negocioInicial={negocio as PerfilNegocioInicial | null} />
      </div>
      {negocio && presencia ? (
        <>
          {/* Qué vende y si quiere que lo encuentren: el mismo bloque que el
              paso 2 del alta, para que las dos pantallas no pregunten distinto.
              Tiene su propio botón porque guarda en otro lado. */}
          <section aria-labelledby="que-vendes-y-donde" className={styles.formulario}>
            <PasoNumerado
              descripcion="Tu rubro, y si quieres aparecer cuando alguien busca en MiPuesto."
              idTitulo="que-vendes-y-donde"
              numero={4}
              titulo="Qué vendes y dónde"
            />
            <QueVendesYDonde
              enlaceMaps={presencia.enlaceMaps}
              inicial={presencia.inicial}
              modo="panel"
              rubroFijo={presencia.rubroFijo}
              zonas={presencia.zonas}
            />
          </section>
          <FormularioOperacion
            operacionInicial={negocio as OperacionNegocioInicial}
          />
          <FormularioIdentidad
            identidadInicial={negocio as IdentidadNegocioInicial}
            negocioNombre={negocio.nombre}
            urlSupabase={url}
          />
          <CodigoQrNegocio
            nombreNegocio={negocio.nombre}
            urlCatalogo={construirUrlPublicaNegocio(negocio.slug)}
          />
        </>
      ) : null}
    </main>
  );
}
