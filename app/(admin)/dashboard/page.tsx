import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { crearClienteSupabaseServidor } from "../../../lib/supabase/server";
import { obtenerInicioResumenSemanal } from "../../../lib/analitica-servidor";
import styles from "./resumen.module.css";

export const metadata: Metadata = {
  title: "Resumen semanal | MiPuesto",
  description: "Actividad reciente del catálogo y accesos rápidos del negocio.",
};

const METRICAS = [
  { tipo: "vista_catalogo", etiqueta: "Visitas al catálogo", ayuda: "Sesiones que abrieron tu enlace público." },
  { tipo: "clic_producto", etiqueta: "Interacciones con productos", ayuda: "Productos agregados o consultados por clientes." },
  { tipo: "clic_whatsapp", etiqueta: "Salidas a WhatsApp", ayuda: "Personas que continuaron la conversación por WhatsApp." },
] as const;

export default async function PaginaDashboard() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login?motivo=sesion");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("id,nombre,slug,activo")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();
  if (!negocio) redirect("/dashboard/configuracion");

  const desde = obtenerInicioResumenSemanal();
  const conteos = await Promise.all(
    METRICAS.map(({ tipo }) =>
      supabase
        .from("eventos_analitica")
        .select("id", { count: "exact", head: true })
        .eq("negocio_id", negocio.id)
        .eq("tipo", tipo)
        .gte("creado_en", desde),
    ),
  );
  if (conteos.some(({ error }) => error)) {
    throw new Error("No se pudo cargar el resumen semanal.");
  }

  return (
    <main className={styles.contenido}>
      <header className={styles.encabezado}>
        <p>Últimos 7 días</p>
        <h1>Resumen de {negocio.nombre}</h1>
        <p>
          Estas cifras muestran cómo llegan y avanzan las personas en tu catálogo. No incluyen
          nombres, teléfonos ni el contenido de los pedidos.
        </p>
      </header>

      {!negocio.activo ? (
        <aside className={styles.inactivo} role="status">
          <strong>Tu catálogo está temporalmente inactivo.</strong>
          <span>Conservas el acceso a tus datos, pero el enlace no aparece en el directorio.</span>
        </aside>
      ) : null}

      <section aria-labelledby="actividad-semanal" className={styles.actividad}>
        <div className={styles.tituloSeccion}>
          <div>
            <p>Actividad pública</p>
            <h2 id="actividad-semanal">Qué hicieron tus visitantes</h2>
          </div>
          <Link href={`/${negocio.slug}`} rel="noreferrer" target="_blank">Ver catálogo</Link>
        </div>
        <dl className={styles.metricas}>
          {METRICAS.map((metrica, indice) => (
            <div key={metrica.tipo}>
              <dt>{metrica.etiqueta}</dt>
              <dd>{conteos[indice].count ?? 0}</dd>
              <p>{metrica.ayuda}</p>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="siguientes-pasos" className={styles.acciones}>
        <h2 id="siguientes-pasos">Accesos rápidos</h2>
        <div>
          <Link href="/dashboard/catalogo">Administrar productos</Link>
          <Link href="/dashboard/pedidos">Revisar pedidos</Link>
          <Link href="/dashboard/configuracion">Compartir el QR</Link>
        </div>
      </section>
    </main>
  );
}
