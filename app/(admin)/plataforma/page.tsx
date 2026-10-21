import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PantallaPlataforma, type ClientePlataforma } from "../../../components/plataforma/pantalla-plataforma";
import type { EtiquetaPlataforma } from "../../../components/plataforma/etiquetas-nfc";
import { SegundoFactor } from "../../../components/plataforma/segundo-factor";
import type { UsoAlmacenamiento } from "../../../lib/plataforma/almacenamiento";
import type { UsoIa } from "../../../lib/ia/limites";
import { TOPE_FOTOS_POR_DIA } from "../../../lib/ia/servidor";
import { cupoDelPlan, planDe } from "../../../lib/planes";
import { COLUMNAS_TUTORIAL } from "../../../lib/catalogo/columnas";
import { leerFiltroClientes, ordenarPorUrgencia, resumirCliente } from "../../../lib/plataforma/clientes";
import { leerPestana } from "../../../lib/plataforma/pestanas";
import { crearClienteSupabaseServidor } from "../../../lib/supabase/server";

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
  const parametros = await searchParams;
  const pestana = leerPestana(parametros.vista);
  const filtro = leerFiltroClientes(parametros.estado);
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
    { data: zonas },
    { data: sinonimos },
    { data: sinResultado, count: totalSinResultado },
    { data: tutoriales },
  ] = await Promise.all([
    supabase
      .from("negocios")
      .select(
        "id,slug,nombre,activo,suspendido_en,suscripcion_vence_en,creado_en,foto_ia_habilitada,rubro,plan_id,ciudad,zona_id,zona_propuesta,rubro_publico",
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
    /* Todas, también las dadas de baja: la plataforma las tiene que ver para
       poder reactivarlas. La política de la tabla se lo permite solo a ella. */
    supabase.from("zonas").select("id,ciudad,nombre,latitud,longitud,activa").order("nombre"),
    supabase.from("sinonimos_busqueda").select("termino,equivalentes").order("termino"),
    /* Las más repetidas primero: son las que más clientes dejaron ir. */
    supabase
      .from("busquedas_sin_resultado")
      .select("termino,ciudad,cantidad,ultima_vez", { count: "exact" })
      .order("cantidad", { ascending: false })
      .limit(20),
    supabase.from("tutoriales").select(COLUMNAS_TUTORIAL).order("numero"),
  ]);
  const fotosPorNegocio = new Map(
    (usoIa ?? []).map(({ negocio_id, cantidad }) => [negocio_id, cantidad]),
  );
  if (error) throw new Error("No se pudo leer la lista de negocios.");

  const clientes: ClientePlataforma[] = ordenarPorUrgencia(
    (negocios ?? []).map((negocio) => resumirCliente(negocio)),
  ).map((cliente) => {
    const plan = planDe(cliente.negocio.plan_id);
    return {
      ...cliente,
      planId: plan.id,
      planNombre: plan.nombre,
      fotosUsadas: fotosPorNegocio.get(cliente.negocio.id) ?? 0,
      topeFotos: cupoDelPlan(cliente.negocio.plan_id, TOPE_FOTOS_POR_DIA).mensual,
    };
  });

  return (
    <PantallaPlataforma
      buscador={{
        sinResultado: sinResultado ?? [],
        sinonimos: sinonimos ?? [],
        totalSinResultado: totalSinResultado ?? 0,
      }}
      clientes={clientes}
      consumo={{
        ia: {
          planes: Object.fromEntries((negocios ?? []).map((negocio) => [negocio.id, planDe(negocio.plan_id).id])),
          uso: (consumoIa as UsoIa | null) ?? null,
        },
        almacenamiento: { uso: (uso as UsoAlmacenamiento | null) ?? null },
      }}
      etiquetas={{
        etiquetas: (etiquetas ?? []) as EtiquetaPlataforma[],
        negocios: (negocios ?? []).map(({ id, nombre }) => ({ id, nombre })),
      }}
      filtro={filtro}
      pestana={pestana}
      resumen={{
        publicados: clientes.filter(({ negocio }) => negocio.activo).length,
        atencion: clientes.filter(({ estado }) => ["suspendido", "vencida", "por_vencer"].includes(estado)).length,
        /* Cada negocio con el precio de su plan. Antes era la cantidad por el
           precio de entrada, y un negocio en el Activo sumaba como si pagara el
           básico. */
        ingresoMensual: clientes
          .filter(({ estado }) => estado !== "fuera_a_mano")
          .reduce((suma, { planId }) => suma + planDe(planId).precioBs, 0),
        conIa: clientes.filter(({ negocio }) => negocio.foto_ia_habilitada === true).length,
      }}
      tutoriales={{ tutoriales: tutoriales ?? [] }}
      zonas={{
        sinZona: (negocios ?? [])
          .filter((negocio) => negocio.ciudad && !negocio.zona_id)
          .map(({ id, nombre, ciudad, zona_propuesta }) => ({ id, nombre, ciudad: ciudad as string, zona_propuesta })),
        zonas: (zonas ?? []).map((zona) => ({
          ...zona,
          latitud: Number(zona.latitud),
          longitud: Number(zona.longitud),
        })),
      }}
    />
  );
}
