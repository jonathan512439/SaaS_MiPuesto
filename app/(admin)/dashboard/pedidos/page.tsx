import { redirect } from "next/navigation";

import {
  GestorPedidos,
  type PedidoAdmin,
} from "../../../../components/pedidos/gestor-pedidos";
import {
  CitasDelDia,
  type CitaAdmin,
} from "../../../../components/pedidos/citas-del-dia";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import styles from "./pedidos.module.css";
import { EncabezadoPanel } from "../../../../components/dashboard/encabezado-panel";

export const dynamic = "force-dynamic";

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

  let pedidos: PedidoAdmin[] = [];
  let citas: CitaAdmin[] = [];
  if (negocio) {
    const { data, error } = await supabase
      .from("pedidos")
      .select(
        "id,codigo,cliente_nombre,cliente_telefono,numero_mesa,total,estado,creado_en,expira_en,confirmado_en,confirmado_por,cancelado_en,cancelado_por,pedido_items(id,producto_codigo,nombre,precio_unitario,cantidad,subtotal,controla_stock)",
      )
      .eq("negocio_id", negocio.id)
      .order("creado_en", { ascending: false })
      .range(0, 49);
    if (error) throw new Error("No se pudieron cargar los pedidos.");
    pedidos = (data ?? []) as PedidoAdmin[];

    /* Los turnos por delante, no el historial: lo que el dueño abre esta
       pantalla a mirar es qué tiene que atender, y las citas viejas empujarían
       eso hacia abajo. Las canceladas quedan fuera por lo mismo. */
    const { data: agendadas } = await supabase
      .from("citas")
      .select("id,codigo,rango,nombre_cliente,telefono_cliente,nota,estado,productos(nombre)")
      .eq("negocio_id", negocio.id)
      .neq("estado", "cancelada")
      .gte("rango", new Date().toISOString())
      .order("rango")
      .range(0, 49);

    citas = (agendadas ?? []).map((cita) => ({
      id: cita.id,
      codigo: cita.codigo,
      /* El rango llega como «[inicio,fin)» y lo que se muestra es el comienzo.
         Se parte acá y no en el componente para que el cliente no tenga que
         conocer cómo Postgres escribe un rango. */
      inicio: String(cita.rango).replace(/^[[(]/, "").split(",")[0].replace(/"/g, ""),
      producto: (cita.productos as { nombre?: string } | null)?.nombre ?? "",
      nombre_cliente: cita.nombre_cliente,
      telefono_cliente: cita.telefono_cliente,
      nota: cita.nota,
      estado: cita.estado,
    }));
  }

  return (
    <main className={styles.contenido}>
      <EncabezadoPanel descripcion="Acá ves y resolvés todos tus pedidos." titulo="Pedidos" />
      <CitasDelDia citasIniciales={citas} />
      <GestorPedidos pedidosIniciales={pedidos} />
    </main>
  );
}
