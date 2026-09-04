import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PRECIO_MENSUAL_BS, construirEnlaceContacto } from "../../../../lib/contacto";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import {
  describirDiasRestantes,
  evaluarSuscripcion,
  formatearFechaVencimiento,
} from "../../../../lib/suscripcion";
import styles from "./cuenta.module.css";

export const metadata: Metadata = {
  title: "Tu cuenta | MiPuesto",
  description: "Estado de tu suscripción y cómo renovarla.",
};

const TITULOS = {
  vigente: "Tu catálogo está al día",
  por_vencer: "Tu mes está por terminar",
  vencida: "Tu catálogo dejó de publicarse",
} as const;

export default async function PaginaCuenta() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login?motivo=sesion");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("nombre,slug,activo,suscripcion_vence_en")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();
  if (!negocio) redirect("/dashboard/configuracion");

  const suscripcion = evaluarSuscripcion(negocio.suscripcion_vence_en, new Date());
  const enlaceRenovar = construirEnlaceContacto(
    `Hola, quiero renovar la suscripción de ${negocio.nombre} en MiPuesto.`,
  );

  return (
    <main className={styles.contenido}>
      <header className={styles.encabezado}>
        <h1>Tu cuenta</h1>
      </header>

      <section aria-labelledby="estado-plan" className={styles.estado} data-estado={suscripcion.estado}>
        <p className={styles.etiqueta}>{describirDiasRestantes(suscripcion.diasRestantes)}</p>
        <h2 id="estado-plan">{TITULOS[suscripcion.estado]}</h2>
        <p className={styles.fecha}>
          {suscripcion.estado === "vencida" ? "Venció el " : "Vence el "}
          <strong>{formatearFechaVencimiento(suscripcion.venceEn)}</strong>
        </p>

        {suscripcion.estado === "vencida" ? (
          <p className={styles.explicacion}>
            Tus productos, pedidos e historial siguen acá y no se borró nada. Al renovar,
            tu catálogo vuelve tal cual estaba.
          </p>
        ) : (
          <p className={styles.explicacion}>
            Escribinos unos días antes para que tu catálogo no deje de verse. Se paga por
            WhatsApp y lo activamos el mismo día.
          </p>
        )}

        <a className={styles.renovar} href={enlaceRenovar} rel="noreferrer" target="_blank">
          {suscripcion.estado === "vencida" ? "Reactivar mi catálogo" : "Renovar por WhatsApp"}
        </a>
      </section>

      <section aria-labelledby="detalle-plan" className={styles.plan}>
        <h2 id="detalle-plan">Tu plan</h2>
        <dl className={styles.datos}>
          <div>
            <dt>Negocio</dt>
            <dd>{negocio.nombre}</dd>
          </div>
          <div>
            <dt>Dirección del catálogo</dt>
            <dd>/{negocio.slug}</dd>
          </div>
          <div>
            <dt>Precio</dt>
            <dd className={styles.monto}>Bs {PRECIO_MENSUAL_BS} al mes</dd>
          </div>
          <div>
            <dt>Publicación</dt>
            <dd>{negocio.activo ? "Tu catálogo se ve" : "Tu catálogo está fuera de línea"}</dd>
          </div>
        </dl>
        <p className={styles.aclaracion}>
          Sin contrato de permanencia y sin comisión por venta. Podés dejar de pagar
          cuando quieras.
        </p>
      </section>
    </main>
  );
}
