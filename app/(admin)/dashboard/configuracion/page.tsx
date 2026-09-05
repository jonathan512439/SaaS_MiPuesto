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
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import { obtenerVariablesPublicasSupabase } from "../../../../lib/supabase/variables";
import { construirUrlPublicaNegocio } from "../../../../lib/url-sitio";
import styles from "./configuracion.module.css";

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
    .select("nombre,slug,descripcion,tipo_negocio,telefono_whatsapp,horario,reserva_minutos,logo_url,portada_url,qr_pago_url,redes_sociales,ubicacion_url,rubro")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  const { url } = obtenerVariablesPublicasSupabase();

  return (
    <main className={styles.contenido}>
      <header className={styles.encabezado}>
        <h1>{negocio ? "Tu negocio" : "Crea el perfil de tu negocio"}</h1>
      </header>

      <div className={styles.rejilla}>
        <FormularioNegocio negocioInicial={negocio as PerfilNegocioInicial | null} />
      </div>
      {negocio ? (
        <>
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
