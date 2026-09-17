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
import { EncabezadoPanel } from "../../../../components/dashboard/encabezado-panel";
import { Isotipo } from "../../../../components/marca/isotipo";
import { RUTA_SIN_NEGOCIO } from "../../../../lib/panel/rutas";
import panel from "../panel.module.css";

export const metadata: Metadata = {
  title: "Tu cuenta | MiPuesto",
  description: "Estado de tu suscripción y cómo renovarla.",
};

const TITULOS = {
  vigente: "Tu catálogo está al día",
  por_vencer: "Tu mes está por terminar",
  vencida: "Tu mes venció",
} as const;

export default async function PaginaCuenta() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login?motivo=sesion");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("nombre,slug,activo,suspendido_en,suscripcion_vence_en")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();
  if (!negocio) redirect(RUTA_SIN_NEGOCIO);

  const suscripcion = evaluarSuscripcion(negocio.suscripcion_vence_en, new Date());
  /* El título sale del estado real y no solo de la fecha: el corte corre una vez
     al día, así que entre el vencimiento y el corte hay unas horas en las que el
     catálogo todavía se ve. Anunciar que dejó de publicarse antes de que ocurra
     es la clase de mentira que esta fase vino a sacar. */
  const suspendidoPorPago = !negocio.activo && negocio.suspendido_en !== null;
  const enlaceRenovar = construirEnlaceContacto(
    `Hola, quiero renovar la suscripción de ${negocio.nombre} en MiPuesto.`,
  );

  return (
    <main className={panel.contenido}>
      <EncabezadoPanel
        descripcion="Administrá tu suscripción y los datos de tu negocio."
        titulo="Tu cuenta"
      />

      <section aria-labelledby="estado-plan" className={styles.estado} data-estado={suscripcion.estado}>
        <p className={styles.etiqueta}>{describirDiasRestantes(suscripcion.diasRestantes)}</p>
        <h2 id="estado-plan">
          {suspendidoPorPago ? "Tu catálogo dejó de publicarse" : TITULOS[suscripcion.estado]}
        </h2>
        <p className={styles.fecha}>
          {suscripcion.estado === "vencida" ? "Venció el " : "Vence el "}
          <strong>{formatearFechaVencimiento(suscripcion.venceEn)}</strong>
        </p>

        {suspendidoPorPago ? (
          <p className={styles.explicacion}>
            Tus productos, pedidos e historial siguen acá y no se borró nada. Al renovar,
            tu catálogo vuelve tal cual estaba.
          </p>
        ) : suscripcion.estado === "vencida" ? (
          <p className={styles.explicacion}>
            Tu catálogo todavía se ve, pero dejará de publicarse en las próximas horas si
            no renovás. Tus datos no se borran.
          </p>
        ) : (
          <p className={styles.explicacion}>
            Escribinos unos días antes para que tu catálogo no deje de verse. Se paga por
            WhatsApp y lo activamos el mismo día.
          </p>
        )}

        <a className={styles.renovar} href={enlaceRenovar} rel="noreferrer" target="_blank">
          {suspendidoPorPago ? "Reactivar mi catálogo" : "Renovar por WhatsApp"}
        </a>
      </section>

      <section aria-labelledby="detalle-plan" className={styles.plan}>
        {/* De quién es el servicio, dicho donde se habla de lo que se paga.
            En el resto del panel todo es del dueño —su negocio, su catálogo, sus
            productos— y está bien que así sea. Esta pantalla es la única que
            habla de la otra punta: a quién le paga y qué contrató. Sin la marca,
            «Tu plan» y «Bs al mes» quedan sin sujeto. */}
        <div className={styles.marca}>
          <Isotipo className={styles.isotipo} />
          <span>MiPuesto</span>
        </div>
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
            <dd>
              {negocio.activo
                ? "Tu catálogo se ve"
                : suspendidoPorPago
                  ? "Fuera de línea por falta de pago"
                  : "Fuera de línea"}
            </dd>
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
