import { redirect } from "next/navigation";

import { GestorAgenda } from "../../../../components/agenda/gestor-agenda";
import { EncabezadoPanel } from "../../../../components/dashboard/encabezado-panel";
import { GestorPedidos, type PedidoAdmin } from "../../../../components/pedidos/gestor-pedidos";
import { leerAgendaAdmin } from "../../../../lib/agenda/datos-admin";
import { RUTA_SIN_NEGOCIO } from "../../../../lib/panel/rutas";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import panel from "../panel.module.css";

export const dynamic = "force-dynamic";

/* Todo lo que espera una decisión, en una pantalla.
 *
 * Eran dos: «Pedidos» y «Agenda». Un dueño que vende cosas **y** turnos tenía
 * que acordarse de mirar las dos, y lo que se olvida de mirar es lo que se
 * atiende tarde. Un turno sin confirmar y un pedido sin confirmar son el mismo
 * trabajo y valen lo mismo.
 *
 * La agenda aparece solo si el negocio la usa: una peluquería ve sus turnos, un
 * restaurante no ve un bloque vacío invitándolo a crear un recurso que no
 * necesita. Es la misma regla que en Herramientas —la pantalla no es igual para
 * dos negocios distintos—.
 */
export default async function PaginaPedidos() {
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
  if (!negocio) redirect(RUTA_SIN_NEGOCIO);

  const [resultadoPedidos, agenda] = await Promise.all([
    supabase
      .from("pedidos")
      .select(
        "id,codigo,cliente_nombre,cliente_telefono,numero_mesa,total,estado,creado_en,expira_en,confirmado_en,confirmado_por,cancelado_en,cancelado_por,pedido_items(id,producto_codigo,nombre,precio_unitario,cantidad,subtotal,controla_stock)",
      )
      .eq("negocio_id", negocio.id)
      .order("creado_en", { ascending: false })
      .range(0, 49),
    leerAgendaAdmin(supabase, negocio.id),
  ]);

  if (resultadoPedidos.error) throw new Error("No se pudieron cargar los pedidos.");
  const pedidos = (resultadoPedidos.data ?? []) as PedidoAdmin[];

  /* Con recursos o con turnos. Lo segundo importa para el negocio que apagó sus
     recursos pero todavía tiene turnos dados: esconderle la agenda sería
     esconderle citas que alguien va a ir a reclamar. */
  const usaAgenda = agenda.recursos.length > 0 || agenda.citas.length > 0;

  return (
    <main className={panel.contenido}>
      {/* El nombre del negocio va en la descripción a propósito. El panel muestra
          el negocio de la cuenta con la que se entró, y quien tiene dos cuentas
          de prueba puede estar mirando la pantalla equivocada sin ninguna pista:
          pasó, y se leyó como «los botones de confirmar no existen». */}
      <EncabezadoPanel
        descripcion={
          usaAgenda
            ? `Los pedidos y los turnos de ${negocio.nombre}, en un solo lugar.`
            : `Acá ves y resolvés todos los pedidos de ${negocio.nombre}.`
        }
        titulo={usaAgenda ? "Pedidos y citas" : "Pedidos"}
      />

      {/* Los turnos arriba: tienen hora. Un pedido espera; el de las tres de la
          tarde, no. */}
      {usaAgenda ? (
        <GestorAgenda
          citasIniciales={agenda.citas}
          recursosIniciales={agenda.recursos}
          servicios={agenda.servicios}
        />
      ) : null}

      <GestorPedidos pedidosIniciales={pedidos} />
    </main>
  );
}
