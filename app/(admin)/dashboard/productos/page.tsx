import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EncabezadoPanel } from "../../../../components/dashboard/encabezado-panel";
import { GestorCatalogo } from "../../../../components/catalogo/gestor-catalogo";
import { leerCatalogoAdmin } from "../../../../lib/catalogo/datos-admin";
import { RUTA_SIN_NEGOCIO } from "../../../../lib/panel/rutas";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import { obtenerVariablesPublicasSupabase } from "../../../../lib/supabase/variables";
import panel from "../panel.module.css";

export const metadata: Metadata = {
  title: "Productos | MiPuesto",
  description: "Carga, busca y actualiza los productos de tu catálogo.",
};

/* Los productos, con la pantalla entera para ellos.
 *
 * Carga lo mismo que «Mi catálogo» —el mismo componente atiende a las dos, y su
 * estado es uno solo— pero dibuja la otra mitad: buscar, filtrar, crear y la
 * lista. El filtro por categoría acá es un desplegable, que es lo que hace falta
 * cuando se viene a trabajar sobre productos y no sobre categorías.
 */
export default async function PaginaProductos() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login?motivo=sesion");

  const datos = await leerCatalogoAdmin(supabase, idUsuario);
  if (!datos) redirect(RUTA_SIN_NEGOCIO);

  const { url } = obtenerVariablesPublicasSupabase();

  return (
    <main className={panel.contenido}>
      <EncabezadoPanel
        descripcion="Gestiona tus productos y mantén tu negocio siempre al día."
        titulo="Productos"
      />

      <GestorCatalogo datosIniciales={datos} urlSupabase={url} vista="productos" />
    </main>
  );
}
