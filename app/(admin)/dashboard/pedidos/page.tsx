import { redirect } from "next/navigation";

import {
  GestorPedidos,
  type PedidoAdmin,
} from "../../../../components/pedidos/gestor-pedidos";
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
  }

  return (
    <main className={styles.contenido}>
      <EncabezadoPanel descripcion="Acá ves y resolvés todos tus pedidos." titulo="Pedidos" />
      <GestorPedidos pedidosIniciales={pedidos} />
    </main>
  );
}
