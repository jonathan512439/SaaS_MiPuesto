import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AccionesCliente } from "../../../components/plataforma/acciones-cliente";
import { InvitarNegocio } from "../../../components/plataforma/invitar-negocio";
import { PRECIO_MENSUAL_BS } from "../../../lib/contacto";
import {
  ETIQUETAS_ESTADO,
  ordenarPorUrgencia,
  resumirCliente,
} from "../../../lib/plataforma/clientes";
import { formatearFechaVencimiento } from "../../../lib/suscripcion";
import { crearClienteSupabaseServidor } from "../../../lib/supabase/server";
import styles from "./plataforma.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Plataforma | MiPuesto",
  description: "Estado de los negocios y acciones de administración.",
  robots: { index: false, follow: false },
};

export default async function PaginaPlataforma() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  if (!datosClaims?.claims.sub) redirect("/login?motivo=sesion");

  const { data: esAdmin } = await supabase.rpc("es_admin_plataforma");
  /* Sin permiso la página no existe, no «está prohibida»: quien no administra la
     plataforma no tiene por qué enterarse de que hay una. */
  if (!esAdmin) notFound();

  const { data: negocios, error } = await supabase
    .from("negocios")
    .select("id,slug,nombre,activo,suspendido_en,suscripcion_vence_en,creado_en")
    .order("nombre");
  if (error) throw new Error("No se pudo leer la lista de negocios.");

  const clientes = ordenarPorUrgencia(
    (negocios ?? []).map((negocio) => resumirCliente(negocio)),
  );
  const cobrables = clientes.filter(({ estado }) => estado !== "fuera_a_mano").length;
  const atencion = clientes.filter(({ estado }) =>
    ["suspendido", "vencida", "por_vencer"].includes(estado),
  ).length;

  return (
    <main className={styles.pagina}>
      <header className={styles.encabezado}>
        <p className={styles.rotulo}>Administración</p>
        <h1>Negocios</h1>
        <p className={styles.resumen}>
          {clientes.length} en total · {atencion} necesitan atención · Bs{" "}
          {cobrables * PRECIO_MENSUAL_BS} al mes si todos pagan
        </p>
      </header>

      <InvitarNegocio />

      {clientes.length === 0 ? (
        <p className={styles.vacio}>Todavía no hay negocios cargados.</p>
      ) : (
        <ul className={styles.lista}>
          {clientes.map(({ negocio, estado, diasRestantes, diasDeGuardaRestantes }) => (
            <li className={styles.cliente} data-estado={estado} key={negocio.id}>
              <div className={styles.identidad}>
                <h2>{negocio.nombre}</h2>
                <p className={styles.direccion}>/{negocio.slug}</p>
              </div>

              <div className={styles.estado}>
                <span className={styles.etiquetaEstado}>{ETIQUETAS_ESTADO[estado]}</span>
                <p>
                  {diasRestantes < 0
                    ? `Venció hace ${Math.abs(diasRestantes)} día(s)`
                    : diasRestantes === 0
                      ? "Vence hoy"
                      : `Vence en ${diasRestantes} día(s)`}
                  {" · "}
                  {formatearFechaVencimiento(new Date(negocio.suscripcion_vence_en))}
                </p>
                {/* Los datos se guardan noventa días desde que sale de línea:
                    saber cuántos quedan es lo que permite escribir a tiempo. */}
                {diasDeGuardaRestantes !== null ? (
                  <p className={styles.guarda}>
                    {diasDeGuardaRestantes > 0
                      ? `Sus datos se guardan ${diasDeGuardaRestantes} día(s) más`
                      : "El plazo de guarda venció: sus datos ya se pueden borrar"}
                  </p>
                ) : null}
              </div>

              <AccionesCliente
                activo={negocio.activo}
                negocioId={negocio.id}
                nombre={negocio.nombre}
                suspendidoPorPago={estado === "suspendido"}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
