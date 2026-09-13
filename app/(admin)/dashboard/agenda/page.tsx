import { redirect } from "next/navigation";

import {
  GestorAgenda,
  type CitaAgenda,
  type RecursoAdmin,
  type ServicioAgendable,
} from "../../../../components/agenda/gestor-agenda";
import { EncabezadoPanel } from "../../../../components/dashboard/encabezado-panel";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import styles from "../pedidos/pedidos.module.css";

export const dynamic = "force-dynamic";

/* Del rango de Postgres —«["2026-09-14 14:00:00+00","2026-09-14 15:00:00+00")»—
   a dos instantes. Se parte acá para que el cliente no tenga que conocer cómo
   la base escribe un rango. */
function partirRango(rango: unknown): { inicio: string; fin: string } {
  const texto = String(rango).replace(/^[[(]/, "").replace(/[\])]$/, "");
  const [inicio, fin] = texto.split(",").map((parte) => parte.replace(/"/g, "").trim());
  return {
    inicio: new Date(inicio).toISOString(),
    fin: new Date(fin).toISOString(),
  };
}

export default async function PaginaAgenda() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login?motivo=sesion");

  const { data: negocio, error: errorNegocio } = await supabase
    .from("negocios")
    .select("id,nombre")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();
  if (errorNegocio) throw new Error("No se pudo cargar tu negocio.");

  let recursos: RecursoAdmin[] = [];
  let citas: CitaAgenda[] = [];
  let servicios: ServicioAgendable[] = [];

  if (negocio) {
    /* Desde el comienzo de hoy en Bolivia, no desde este instante: el dueño
       quiere ver el turno de las 9 aunque sean las 11. Bolivia está cuatro horas
       detrás de UTC y no cambia de hora, así que la medianoche de allá son las
       04:00 de acá. */
    const desde = new Date();
    desde.setTime(desde.getTime() - 4 * 3600_000);
    desde.setUTCHours(4, 0, 0, 0);

    const [resultadoRecursos, resultadoCitas, resultadoServicios] = await Promise.all([
      supabase
        .from("recursos")
        .select("id,nombre,orden,activo,acepta_reservas,agenda_recurso(franjas,duracion_minutos)")
        .eq("negocio_id", negocio.id)
        .order("orden")
        .order("nombre"),
      supabase
        .from("citas")
        .select(
          "id,codigo,recurso_id,rango,nombre_cliente,telefono_cliente,nota,nota_interna,estado,origen,productos(nombre)",
        )
        .eq("negocio_id", negocio.id)
        /* `rangeGte` y no `gte`: la columna es un rango de tiempo, y compararla
           con una fecha suelta hace que Postgres rechace la consulta entera con
           «malformed range literal». Con `gte` la pantalla mostraba cero turnos
           **sin ningún error a la vista**, porque el error se ignoraba abajo.
           «No se extiende a la izquierda de [desde, ∞)» es exactamente «empieza
           en desde o después». */
        .rangeGte("rango", `[${desde.toISOString()},)`)
        .order("rango")
        .range(0, 199),
      supabase
        .from("productos")
        .select("id,nombre,recurso_id,categorias!inner(vende)")
        .eq("negocio_id", negocio.id)
        .eq("categorias.vende", "tiempo")
        .is("eliminado_en", null)
        .order("nombre"),
    ]);

    /* Las tres consultas fallan a la vista. La primera versión solo miraba la de
       recursos, y por eso una consulta de citas rota se veía como «no hay turnos»
       en vez de como un error: el dueño no podía confirmar nada y no sabía por
       qué. */
    if (resultadoRecursos.error) throw new Error("No se pudo cargar la agenda.");
    if (resultadoCitas.error) {
      throw new Error(`No se pudieron cargar los turnos: ${resultadoCitas.error.message}`);
    }
    if (resultadoServicios.error) throw new Error("No se pudieron cargar los servicios.");

    recursos = (resultadoRecursos.data ?? []).map((fila) => {
      const agenda = Array.isArray(fila.agenda_recurso)
        ? fila.agenda_recurso[0]
        : fila.agenda_recurso;
      return {
        id: fila.id,
        nombre: fila.nombre,
        orden: fila.orden,
        activo: fila.activo,
        acepta_reservas: fila.acepta_reservas,
        franjas: agenda?.franjas ?? [],
        duracion_minutos: agenda?.duracion_minutos ?? null,
      };
    });

    citas = (resultadoCitas.data ?? []).map((fila) => {
      const { inicio, fin } = partirRango(fila.rango);
      const producto = Array.isArray(fila.productos) ? fila.productos[0] : fila.productos;
      return {
        id: fila.id,
        codigo: fila.codigo,
        recurso_id: fila.recurso_id,
        inicio,
        fin,
        producto: (producto as { nombre?: string } | null)?.nombre ?? null,
        nombre_cliente: fila.nombre_cliente,
        telefono_cliente: fila.telefono_cliente,
        nota: fila.nota,
        nota_interna: fila.nota_interna,
        estado: fila.estado,
        origen: fila.origen,
      };
    });

    servicios = (resultadoServicios.data ?? []).map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      recurso_id: fila.recurso_id,
    }));
  }

  return (
    <main className={styles.contenido}>
      {/* El nombre del negocio va en la descripción a propósito. El panel muestra
          el negocio de la cuenta con la que se entró, y quien tiene dos cuentas
          de prueba puede estar mirando la agenda equivocada sin ninguna pista:
          pasó, y se leyó como «los botones de confirmar no existen». */}
      <EncabezadoPanel
        descripcion={
          negocio
            ? `Agenda de ${negocio.nombre}: quién atiende, cuándo, y todos los turnos en un solo lugar.`
            : "Quién atiende, cuándo, y todos los turnos en un solo lugar."
        }
        titulo="Agenda"
      />
      <GestorAgenda citasIniciales={citas} recursosIniciales={recursos} servicios={servicios} />
    </main>
  );
}
