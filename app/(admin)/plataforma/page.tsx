import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AccionesCliente } from "../../../components/plataforma/acciones-cliente";
import { EtiquetasNfc } from "../../../components/plataforma/etiquetas-nfc";
import type { EtiquetaPlataforma } from "../../../components/plataforma/etiquetas-nfc";
import { InvitarNegocio } from "../../../components/plataforma/invitar-negocio";
import { UsoAlmacenamientoPanel } from "../../../components/plataforma/uso-almacenamiento";
import type { UsoAlmacenamiento } from "../../../lib/plataforma/almacenamiento";
import { SegundoFactor } from "../../../components/plataforma/segundo-factor";
import { PRECIO_MENSUAL_BS } from "../../../lib/contacto";
import type { UsoIa } from "../../../lib/ia/limites";
import { TOPE_FOTOS_POR_MES } from "../../../lib/ia/servidor";
import { UsoIaPanel } from "../../../components/plataforma/uso-ia";
import {
  ETIQUETAS_ESTADO,
  ordenarPorUrgencia,
  resumirCliente,
} from "../../../lib/plataforma/clientes";
import { formatearFechaVencimiento } from "../../../lib/suscripcion";
import { crearClienteSupabaseServidor } from "../../../lib/supabase/server";
import styles from "./plataforma.module.css";
import { EncabezadoPanel } from "../../../components/dashboard/encabezado-panel";

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

  /* Esta cuenta ya no protege un negocio sino a todos, así que exige segundo
     factor. `aal2` significa que la sesión lo completó; `aal1` es solo
     contraseña, y con eso no se entra. Qué mostrar —inscribir o pedir el
     código— lo resuelve el componente, que es quien puede consultar los factores
     desde el navegador. */
  if (datosClaims.claims.aal !== "aal2") {
    return <SegundoFactor />;
  }

  const [
    { data: negocios, error },
    { data: etiquetas },
    { data: uso },
    { data: usoIa },
    { data: consumoIa },
  ] = await Promise.all([
    supabase
      .from("negocios")
      .select(
        "id,slug,nombre,activo,suspendido_en,suscripcion_vence_en,creado_en,foto_ia_habilitada",
      )
      .order("nombre"),
    supabase
      .from("etiquetas")
      .select("codigo,negocio_id,nota,creado_en,ultimo_uso_en")
      .order("creado_en", { ascending: false }),
    /* Se mide al abrir la pantalla, no con un contador guardado: un contador
       mantenido por disparadores se desincroniza al primer borrado que no pase
       por la aplicación, y un número de ocupación equivocado es peor que no
       tenerlo, porque se decide con él. */
    supabase.rpc("uso_almacenamiento"),
    /* El consumo del mes se lee junto con el resto: sin el número delante,
       habilitar la lectura de fotos es firmar un gasto a ciegas. */
    supabase
      .from("uso_ia_negocio")
      .select("negocio_id,cantidad")
      .eq("mes", new Date().toISOString().slice(0, 8) + "01"),
    /* Las ventanas por minuto y por día que Google usa para limitar. Se cuentan
       de este lado porque su API no dice cuánto queda. */
    supabase.rpc("uso_ia"),
  ]);
  const fotosPorNegocio = new Map(
    (usoIa ?? []).map(({ negocio_id, cantidad }) => [negocio_id, cantidad]),
  );
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
      <EncabezadoPanel
        descripcion={`${clientes.length} en total · ${atencion} necesitan atención · Bs ${cobrables * PRECIO_MENSUAL_BS} al mes si todos pagan`}
        rotulo="Administración"
        titulo="Negocios"
      />

      <InvitarNegocio />

      <UsoIaPanel uso={(consumoIa as UsoIa | null) ?? null} />

      <UsoAlmacenamientoPanel uso={(uso as UsoAlmacenamiento | null) ?? null} />

      <EtiquetasNfc
        etiquetas={(etiquetas ?? []) as EtiquetaPlataforma[]}
        negocios={(negocios ?? []).map(({ id, nombre }) => ({ id, nombre }))}
      />

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
                fotoIaHabilitada={negocio.foto_ia_habilitada === true}
                fotosUsadas={fotosPorNegocio.get(negocio.id) ?? 0}
                negocioId={negocio.id}
                nombre={negocio.nombre}
                suspendidoPorPago={estado === "suspendido"}
                topeFotos={TOPE_FOTOS_POR_MES}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
