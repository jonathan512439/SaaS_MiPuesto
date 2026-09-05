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
    .select("activo,suspendido_en,suscripcion_vence_en")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();
  const suscripcion = negocioSuscripcion
    ? evaluarSuscripcion(negocioSuscripcion.suscripcion_vence_en, new Date())
    : null;
  const avisaSuscripcion = suscripcion !== null && suscripcion.estado !== "vigente";
  const suspendidoPorPago =
    negocioSuscripcion !== null &&
    !negocioSuscripcion.activo &&
    negocioSuscripcion.suspendido_en !== null;

  /* El enlace a la plataforma solo aparece para quien la administra. Sin él hay
     que recordar una dirección que no está en ningún lado, y equivocarse lleva a
     un «no encontramos este negocio» que no explica nada. */
  const { data: esAdminPlataforma } = await supabase.rpc("es_admin_plataforma");

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
                  {esAdminPlataforma ? (
                    <Link className={styles.enlacePlataforma} href="/plataforma">
                      Plataforma
                    </Link>
                  ) : null}
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
                  {suspendidoPorPago
                    ? `Tu catálogo dejó de publicarse. Venció el ${formatearFechaVencimiento(suscripcion.venceEn)} y tus datos siguen acá.`
                    : suscripcion.estado === "vencida"
                      ? `Venció el ${formatearFechaVencimiento(suscripcion.venceEn)}. Tu catálogo deja de publicarse en las próximas horas.`
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
