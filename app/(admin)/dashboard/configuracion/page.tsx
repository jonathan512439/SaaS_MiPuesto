import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CerrarSesion } from "../../../../components/negocios/cerrar-sesion";
import {
  FormularioNegocio,
  type PerfilNegocioInicial,
} from "../../../../components/negocios/formulario-negocio";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
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
    .select("nombre,slug,descripcion,tipo_negocio,telefono_whatsapp")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  const correo =
    typeof datosClaims.claims.email === "string"
      ? datosClaims.claims.email
      : "Administrador invitado";

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <div className={styles.barraContenido}>
          <div>
            <p className={styles.marca}>MiPuesto</p>
            <p className={styles.sesion}>{correo}</p>
          </div>
          <CerrarSesion className={styles.botonSalir} />
        </div>
      </header>

      <div className={styles.contenido}>
        <header className={styles.encabezado}>
          <p>{negocio ? "Configuración del catálogo" : "Alta inicial"}</p>
          <h1>{negocio ? "Revisa los datos de tu negocio" : "Crea el perfil de tu negocio"}</h1>
          <p>
            Esta información será la base del catálogo. Podrás agregar fotos,
            horarios y productos en las siguientes etapas.
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
            <p>
              Tu negocio queda vinculado únicamente a <strong>{correo}</strong>.
            </p>
            <p>
              El enlace público se habilitará cuando publiques el catálogo. Por ahora,
              esta configuración reserva tu dirección y mantiene tus datos privados.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
