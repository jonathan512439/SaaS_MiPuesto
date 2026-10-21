import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormularioBanners } from "../../../../components/promociones/formulario-banners";
import { GestorPromociones } from "../../../../components/promociones/gestor-promociones";
import { COLUMNAS_VISTA_PREVIA_NEGOCIO } from "../../../../lib/catalogo/columnas";
import { armarVistaPrevia } from "../../../../lib/plantillas/vista-previa-del-negocio";
import { obtenerVariablesPublicasSupabase } from "../../../../lib/supabase/variables";
import { construirUrlPublicaNegocio } from "../../../../lib/url-sitio";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import { EncabezadoPanel } from "../../../../components/dashboard/encabezado-panel";
import { RUTA_SIN_NEGOCIO } from "../../../../lib/panel/rutas";
import panel from "../panel.module.css";

export const metadata: Metadata = {
  title: "Promociones | MiPuesto",
  description: "Prepara descuentos por producto o categoría, y los dos banners de tu catálogo.",
};

export default async function PaginaPromociones() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login?motivo=sesion");

  const { data: negocio } = await supabase
    .from("negocios")
    .select(COLUMNAS_VISTA_PREVIA_NEGOCIO)
    .eq("admin_user_id", idUsuario)
    .maybeSingle();
  if (!negocio) redirect(RUTA_SIN_NEGOCIO);

  const [resultadoCategorias, resultadoProductos, resultadoPromociones] = await Promise.all([
    supabase
      .from("categorias")
      .select("id,nombre")
      .eq("negocio_id", negocio.id)
      .order("orden")
      .order("nombre"),
    supabase
      .from("productos")
      .select("id,codigo,nombre,precio,categoria_id,visible")
      .eq("negocio_id", negocio.id)
      .is("eliminado_en", null)
      .order("nombre"),
    supabase
      .from("promociones")
      .select("id,negocio_id,tipo,valor,producto_id,categoria_id,fecha_inicio,fecha_fin,activo,hora_inicio,hora_fin,dias")
      .eq("negocio_id", negocio.id)
      .order("fecha_fin", { ascending: false, nullsFirst: true }),
  ]);

  if (resultadoCategorias.error || resultadoProductos.error || resultadoPromociones.error) {
    throw new Error("No se pudo cargar la configuración de promociones.");
  }

  /* Los banners viven acá desde el 2026-10-13: son publicidad, como las
     promociones. Con la misma vista previa del catálogo que Apariencia. */
  const { url: urlSupabase } = obtenerVariablesPublicasSupabase();
  const vista = armarVistaPrevia(negocio, urlSupabase);
  const productosVisibles = (resultadoProductos.data ?? []).filter((producto) => producto.visible);

  return (
    <main className={panel.contenido}>
      <EncabezadoPanel
        descripcion="Si coinciden varias, se aplica la que deje el precio más bajo."
        titulo="Promociones"
      />
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
      <FormularioBanners
        destinos={{
          urlCatalogo: construirUrlPublicaNegocio(negocio.slug),
          telefonoWhatsapp: negocio.telefono_whatsapp,
          ubicacionUrl: negocio.ubicacion_url,
          categorias: (resultadoCategorias.data ?? []).map(({ id, nombre }) => ({ id, nombre })),
          productos: productosVisibles.map(({ codigo, nombre }) => ({ codigo, nombre })),
        }}
        vista={vista}
      />
    </main>
  );
}
