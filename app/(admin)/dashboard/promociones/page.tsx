import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GestorPromociones } from "../../../../components/promociones/gestor-promociones";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import styles from "./promociones.module.css";

export const metadata: Metadata = {
  title: "Promociones | MiPuesto",
  description: "Prepara descuentos por producto o categoría para tu catálogo.",
};

export default async function PaginaPromociones() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login?motivo=sesion");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("id,nombre")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();
  if (!negocio) redirect("/dashboard/configuracion");

  const [resultadoCategorias, resultadoProductos, resultadoPromociones] = await Promise.all([
    supabase
      .from("categorias")
      .select("id,nombre")
      .eq("negocio_id", negocio.id)
      .order("orden")
      .order("nombre"),
    supabase
      .from("productos")
      .select("id,nombre,precio,categoria_id,visible")
      .eq("negocio_id", negocio.id)
      .is("eliminado_en", null)
      .order("nombre"),
    supabase
      .from("promociones")
      .select("id,negocio_id,tipo,valor,producto_id,categoria_id,fecha_inicio,fecha_fin,activo")
      .eq("negocio_id", negocio.id)
      .order("fecha_fin", { ascending: false, nullsFirst: true }),
  ]);

  if (resultadoCategorias.error || resultadoProductos.error || resultadoPromociones.error) {
    throw new Error("No se pudo cargar la configuración de promociones.");
  }

  return (
    <main className={styles.contenido}>
      <header className={styles.encabezado}>
        <h1>Promociones</h1>
        <p>Si coinciden varias, se aplica la que deje el precio más bajo.</p>
      </header>
      <GestorPromociones
        categorias={resultadoCategorias.data ?? []}
        negocioNombre={negocio.nombre}
        productos={(resultadoProductos.data ?? []).map((producto) => ({
          ...producto,
          precio: Number(producto.precio),
        }))}
        promocionesIniciales={(resultadoPromociones.data ?? []).map((promocion) => ({
          ...promocion,
          valor: Number(promocion.valor),
        }))}
      />
    </main>
  );
}
