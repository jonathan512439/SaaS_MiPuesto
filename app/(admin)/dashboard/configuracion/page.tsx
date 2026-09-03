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
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import { obtenerVariablesPublicasSupabase } from "../../../../lib/supabase/variables";
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
    .select("nombre,slug,descripcion,tipo_negocio,telefono_whatsapp,horario,reserva_minutos,logo_url,portada_url,qr_pago_url,redes_sociales")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  const { url } = obtenerVariablesPublicasSupabase();

  return (
    <main className={styles.contenido}>
      <header className={styles.encabezado}>
        <p>{negocio ? "Configuración del catálogo" : "Alta inicial"}</p>
        <h1>{negocio ? "Revisa los datos de tu negocio" : "Crea el perfil de tu negocio"}</h1>
        <p>
          Revisa los datos, la modalidad y las condiciones con las que recibirás pedidos.
        </p>
      </header>

      <div className={styles.rejilla}>
        <FormularioNegocio negocioInicial={negocio as PerfilNegocioInicial | null} />
        <aside className={styles.resumen} aria-labelledby="resumen-configuracion">
          <h2 id="resumen-configuracion">Qué se configura ahora</h2>
          <ul>
            <li>El nombre que verán tus clientes.</li>
            <li>La dirección corta que reservarás para tu catálogo.</li>
            <li>La modalidad con la que atenderás a tus clientes.</li>
            <li>El WhatsApp que recibirá consultas.</li>
          </ul>
          <p>Este negocio está protegido por tu cuenta de administrador.</p>
          <p>
            El enlace público se habilitará cuando publiques el catálogo. Por ahora,
            esta configuración reserva tu dirección y mantiene tus datos privados.
          </p>
        </aside>
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
        </>
      ) : null}
    </main>
  );
}
