import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { NavegacionDashboard } from "../../../components/dashboard/navegacion-dashboard";
import { CerrarSesion } from "../../../components/negocios/cerrar-sesion";
import { ProveedorSupabaseNavegador } from "../../../components/supabase/proveedor-supabase-navegador";
import { crearClienteSupabaseServidor } from "../../../lib/supabase/server";
import { obtenerVariablesPublicasSupabase } from "../../../lib/supabase/variables";
import styles from "./dashboard.module.css";

type PropiedadesLayoutPanel = Readonly<{
  children: ReactNode;
}>;

export default async function LayoutPanel({ children }: PropiedadesLayoutPanel) {
  const { clavePublica, url } = obtenerVariablesPublicasSupabase();
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;

  if (!idUsuario) redirect("/login?motivo=sesion");

  const correo =
    typeof datosClaims.claims.email === "string"
      ? datosClaims.claims.email
      : "Administrador invitado";

  return (
    <ProveedorSupabaseNavegador clavePublica={clavePublica} url={url}>
      <div className={styles.pagina}>
        <header className={styles.barra}>
          <div className={styles.barraContenido}>
            <div className={styles.identidad}>
              <p className={styles.marca}>MiPuesto</p>
              <p className={styles.sesion}>{correo}</p>
            </div>
            <NavegacionDashboard />
            <CerrarSesion className={styles.botonSalir} />
          </div>
        </header>
        {children}
      </div>
    </ProveedorSupabaseNavegador>
  );
}
