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
  title: "Mi catálogo | MiPuesto",
  description: "Las categorías de tu catálogo, con sus íconos, sus campos y sus horarios.",
};

/* Las categorías, solas.
 *
 * Estaban plegadas arriba de la lista de productos, en un panel que casi nadie
 * descubría que se abría. Son dos trabajos distintos: armar las categorías se
 * hace una vez y se retoca de vez en cuando; cargar productos se hace todos los
 * días. Juntos, el que se hace una vez le comía sitio al que se hace siempre.
 */
export default async function PaginaCatalogo() {
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
        descripcion="Las categorías son las secciones de tu catálogo. Acá elegís su ícono, qué datos pide cada una y, si vendés turnos, sus horarios."
        titulo="Mi catálogo"
      />

      <GestorCatalogo datosIniciales={datos} urlSupabase={url} vista="categorias" />
    </main>
  );
}
