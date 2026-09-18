import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccionesCliente } from "../../../components/plataforma/acciones-cliente";
import { CambioDeRubro } from "../../../components/plataforma/cambio-de-rubro";
import { EtiquetasNfc } from "../../../components/plataforma/etiquetas-nfc";
import type { EtiquetaPlataforma } from "../../../components/plataforma/etiquetas-nfc";
import { InvitarNegocio } from "../../../components/plataforma/invitar-negocio";
import { UsoAlmacenamientoPanel } from "../../../components/plataforma/uso-almacenamiento";
import type { UsoAlmacenamiento } from "../../../lib/plataforma/almacenamiento";
import { SegundoFactor } from "../../../components/plataforma/segundo-factor";
import { PRECIO_MENSUAL_BS } from "../../../lib/contacto";
import { nombreDeRubro } from "../../../lib/negocios/rubros";
import type { UsoIa } from "../../../lib/ia/limites";
import { TOPE_FOTOS_POR_DIA } from "../../../lib/ia/servidor";
import { cupoDelPlan, planDe } from "../../../lib/planes";
import { UsoIaPanel } from "../../../components/plataforma/uso-ia";
import {
  ETIQUETAS_ESTADO,
  ordenarPorUrgencia,
  resumirCliente,
} from "../../../lib/plataforma/clientes";
import { PESTANAS_PLATAFORMA, leerPestana } from "../../../lib/plataforma/pestanas";
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

export default async function PaginaPlataforma({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const pestana = leerPestana((await searchParams).vista);
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
        "id,slug,nombre,activo,suspendido_en,suscripcion_vence_en,creado_en,foto_ia_habilitada,rubro,plan_id",
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
        descripcion={`${clientes.length} negocios · ${atencion} necesitan atención · Bs ${cobrables * PRECIO_MENSUAL_BS} al mes si todos pagan`}
        rotulo="Administración"
        titulo="Plataforma"
      />

      {/* Las pestañas van en la dirección y no en el estado del navegador: así
          «Consumo» se puede guardar en favoritos, y volver de una acción no
          devuelve al administrador a la primera. */}
      <nav aria-label="Secciones de la plataforma" className={styles.pestanas}>
        {PESTANAS_PLATAFORMA.map(({ id, titulo, pregunta }) => (
          <Link
            aria-current={id === pestana ? "page" : undefined}
            className={id === pestana ? styles.pestanaActiva : styles.pestana}
            href={id === "negocios" ? "/plataforma" : `/plataforma?vista=${id}`}
            key={id}
          >
            <strong>{titulo}</strong>
            <small>{pregunta}</small>
          </Link>
        ))}
      </nav>

      {pestana === "consumo" ? (
        <>
          <UsoIaPanel
            planes={Object.fromEntries(
              (negocios ?? []).map((negocio) => [negocio.id, planDe(negocio.plan_id).id]),
            )}
            uso={(consumoIa as UsoIa | null) ?? null}
          />
          <UsoAlmacenamientoPanel uso={(uso as UsoAlmacenamiento | null) ?? null} />
        </>
      ) : null}

      {pestana === "herramientas" ? (
        <>
          <InvitarNegocio />
          <EtiquetasNfc
            etiquetas={(etiquetas ?? []) as EtiquetaPlataforma[]}
            negocios={(negocios ?? []).map(({ id, nombre }) => ({ id, nombre }))}
          />
        </>
      ) : null}

      {pestana !== "negocios" ? null : clientes.length === 0 ? (
        <p className={styles.vacio}>Todavía no hay negocios cargados.</p>
      ) : (
        <ul className={styles.lista}>
          {clientes.map(({ negocio, estado, diasRestantes, diasDeGuardaRestantes }) => (
            <li className={styles.cliente} data-estado={estado} key={negocio.id}>
              <div className={styles.identidad}>
                <h2>{negocio.nombre}</h2>
                {/* La dirección es un enlace y no un renglón de texto: revisar el
                    catálogo de un cliente es lo que se viene a hacer a esta
                    lista, y copíar el slug a mano para pegarlo en la barra no
                    es una forma de hacerlo.

                    Se abre en otra pestaña para no perder el lugar en una lista
                    larga, y con `a` en vez de `Link` a propósito: `Link`
                    precargaría **todos** los catálogos de la lista al mostrarla.

                    Fuera de línea no se enlaza. El catálogo público filtra por
                    `activo`, así que el enlace llevaría a un «no encontrado» y
                    se leería como un error del sistema en vez de como lo que
                    es: un negocio dado de baja. */}
                {negocio.activo ? (
                  <a
                    className={styles.direccion}
                    href={`/${negocio.slug}`}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    /{negocio.slug}
                  </a>
                ) : (
                  <p className={styles.direccion}>
                    /{negocio.slug} · <span>sin catálogo público</span>
                  </p>
                )}

                {/* Los tres datos que hacen falta para hablar con este cliente,
                    y que hasta ahora obligaban a abrir su panel: a qué se
                    dedica, desde cuándo es cliente, y si tiene encendida la
                    herramienta que cuesta dinero. Ninguno pide una consulta
                    nueva: los tres ya venían en la fila. */}
                <ul className={styles.datos}>
                  <li>{nombreDeRubro(negocio.rubro)}</li>
                  <li>
                    Cliente desde {formatearFechaVencimiento(new Date(negocio.creado_en))}
                  </li>
                  {negocio.foto_ia_habilitada ? (
                    <li data-ia="si">
                      IA · {fotosPorNegocio.get(negocio.id) ?? 0} de{" "}
                      {cupoDelPlan(negocio.plan_id, TOPE_FOTOS_POR_DIA).mensual} este
                      mes
                    </li>
                  ) : null}
                </ul>
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
                planId={planDe(negocio.plan_id).id}
                suspendidoPorPago={estado === "suspendido"}
                topeFotos={cupoDelPlan(negocio.plan_id, TOPE_FOTOS_POR_DIA).mensual}
              />

              <CambioDeRubro
                negocioId={negocio.id}
                nombre={negocio.nombre}
                rubroActual={negocio.rubro ?? null}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
