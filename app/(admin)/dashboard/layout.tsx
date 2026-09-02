import type { ReactNode } from "react";
import Link from "next/link";
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
            <Link className={styles.marca} href="/dashboard/catalogo" aria-label="MiPuesto, ir al catálogo">
              <span aria-hidden="true" className={styles.isotipo}>M</span>
              <span>MiPuesto</span>
            </Link>
            <div className={styles.cuenta}>
              <p className={styles.sesion}>{correo}</p>
              <CerrarSesion className={styles.botonSalir} texto="Salir" />
            </div>
            <NavegacionDashboard />
          </div>
        </header>
        {children}
      </div>
    </ProveedorSupabaseNavegador>
  );
}
