import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormularioBanners } from "../../../../components/promociones/formulario-banners";
import { GestorPromociones } from "../../../../components/promociones/gestor-promociones";
import { esPaletaId } from "../../../../lib/plantillas/validacion";
import { leerBanners } from "../../../../lib/negocios/banners";
import { obtenerUrlPublicaImagenNegocio } from "../../../../lib/negocios/imagenes-publicas";
import { obtenerVariablesPublicasSupabase } from "../../../../lib/supabase/variables";
import { construirUrlPublicaNegocio } from "../../../../lib/url-sitio";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import { EncabezadoPanel } from "../../../../components/dashboard/encabezado-panel";
import { RUTA_SIN_NEGOCIO } from "../../../../lib/panel/rutas";
import panel from "../panel.module.css";

export const metadata: Metadata = {
  title: "Promociones | MiPuesto",
  description: "Prepara descuentos por producto o categoría, y el banner publicitario de tu catálogo.",
};

export default async function PaginaPromociones() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login?motivo=sesion");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("id,nombre,slug,paleta_id,banners,telefono_whatsapp,ubicacion_url")
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

  /* El banner publicitario vive acá desde el 2026-10-13: es publicidad, como
     las promociones. Se arma lo mismo que necesitaba en Apariencia —la
     dirección de su imagen, la paleta y a dónde puede llevar su botón—. */
  const bannersGuardados = leerBanners(negocio.banners);
  const { url: urlSupabase } = obtenerVariablesPublicasSupabase();
  const urlPorRuta = Object.fromEntries(
    bannersGuardados
      .filter((banner) => banner !== null)
      .map((banner) => [
        banner.imagen,
        obtenerUrlPublicaImagenNegocio(urlSupabase, banner.imagen, "banner") ?? "",
      ]),
  );
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
        bannersIniciales={bannersGuardados}
        destinos={{
          urlCatalogo: construirUrlPublicaNegocio(negocio.slug),
          telefonoWhatsapp: negocio.telefono_whatsapp,
          ubicacionUrl: negocio.ubicacion_url,
          categorias: (resultadoCategorias.data ?? []).map(({ id, nombre }) => ({ id, nombre })),
          productos: productosVisibles.map(({ codigo, nombre }) => ({ codigo, nombre })),
        }}
        paleta={esPaletaId(negocio.paleta_id) ? negocio.paleta_id : "mercado"}
        urlPorRuta={urlPorRuta}
      />
    </main>
  );
}
