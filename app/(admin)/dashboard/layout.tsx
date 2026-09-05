import type { ReactNode } from "react";
import { PieSitio } from "../../../components/sitio/pie-sitio";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NavegacionDashboard } from "../../../components/dashboard/navegacion-dashboard";
import { CerrarSesion } from "../../../components/negocios/cerrar-sesion";
import { ProveedorSupabaseNavegador } from "../../../components/supabase/proveedor-supabase-navegador";
import { ProveedorAvisos, ProveedorConfirmacion } from "../../../components/ui";
import { crearClienteSupabaseServidor } from "../../../lib/supabase/server";
import {
  describirDiasRestantes,
  evaluarSuscripcion,
  formatearFechaVencimiento,
} from "../../../lib/suscripcion";
import { obtenerVariablesPublicasSupabase } from "../../../lib/supabase/variables";
import styles from "./dashboard.module.css";

type PropiedadesLayoutPanel = Readonly<{
  children: ReactNode;
}>;

export default async function LayoutPanel({
  children,
}: PropiedadesLayoutPanel) {
  const { clavePublica, url } = obtenerVariablesPublicasSupabase();
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;

  if (!idUsuario) redirect("/login?motivo=sesion");

  /* El aviso vive en el layout y no en una pantalla suelta: si el dueño tiene
     que entrar a buscarlo, se entera el día que su catálogo deja de verse. */
  const { data: negocioSuscripcion } = await supabase
    .from("negocios")
    .select("suscripcion_vence_en")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();
  const suscripcion = negocioSuscripcion
    ? evaluarSuscripcion(negocioSuscripcion.suscripcion_vence_en, new Date())
    : null;
  const avisaSuscripcion = suscripcion !== null && suscripcion.estado !== "vigente";

  const correo =
    typeof datosClaims.claims.email === "string"
      ? datosClaims.claims.email
      : "Administrador invitado";

  return (
    <ProveedorSupabaseNavegador clavePublica={clavePublica} url={url}>
      <ProveedorAvisos>
        <ProveedorConfirmacion>
          <div className={styles.pagina}>
            <header className={styles.barra}>
              <div className={styles.barraContenido}>
                <Link
                  className={styles.marca}
                  href="/dashboard/catalogo"
                  aria-label="MiPuesto, ir al catálogo"
                >
                  <Image
                    alt=""
                    className={styles.isotipo}
                    height={325}
                    priority
                    src="/marca/mipuesto-marca.png"
                    width={256}
                  />
                  <span>MiPuesto</span>
                </Link>
                <div className={styles.cuenta}>
                  <p className={styles.sesion}>{correo}</p>
                  <CerrarSesion className={styles.botonSalir} texto="Salir" />
                </div>
                <NavegacionDashboard />
              </div>
            </header>
            {avisaSuscripcion ? (
              <aside
                className={styles.avisoSuscripcion}
                data-estado={suscripcion.estado}
                role="status"
              >
                <p>
                  <strong>{describirDiasRestantes(suscripcion.diasRestantes)}</strong>{" "}
                  {suscripcion.estado === "vencida"
                    ? `Tu catálogo dejó de publicarse el ${formatearFechaVencimiento(suscripcion.venceEn)}. Tus datos siguen acá.`
                    : `Tu mes termina el ${formatearFechaVencimiento(suscripcion.venceEn)}.`}
                </p>
                <Link href="/dashboard/cuenta">Ver mi cuenta</Link>
              </aside>
            ) : null}
            {children}
            <PieSitio />
          </div>
        </ProveedorConfirmacion>
      </ProveedorAvisos>
    </ProveedorSupabaseNavegador>
  );
}
