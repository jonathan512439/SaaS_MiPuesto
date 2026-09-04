import { ImageResponse } from "next/og";

import { obtenerUrlPublicaImagenProducto } from "../../../../../lib/catalogo/imagenes-publicas";
import { COLORES_MIPUESTO } from "../../../../../lib/identidad-visual";
import { formatearPrecioBolivianos } from "../../../../../lib/precios";
import { crearClienteSupabasePublico } from "../../../../../lib/supabase/public";
import { obtenerVariablesPublicasSupabase } from "../../../../../lib/supabase/variables";

export const alt = "Producto en MiPuesto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

/* Esta imagen es la razón de ser de la página de producto: es lo que se ve al
   pegar el enlace en WhatsApp. La foto ocupa la mitad y el precio es el dato
   más grande, porque en una conversación se decide por foto y precio. */
export default async function ImagenProducto({
  params,
}: {
  params: Promise<{ slug: string; codigo: string }>;
}) {
  const { slug, codigo } = await params;
  const supabase = crearClienteSupabasePublico();
  const { data: negocio } = await supabase
    .from("negocios")
    .select("id,nombre")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();
  const { data: producto } = negocio
    ? await supabase
        .from("productos")
        .select("nombre,precio,fotos")
        .eq("negocio_id", negocio.id)
        .eq("codigo", codigo)
        .eq("visible", true)
        .maybeSingle()
    : { data: null };

  const { url } = obtenerVariablesPublicasSupabase();
  const foto = producto?.fotos?.[0]
    ? obtenerUrlPublicaImagenProducto(url, producto.fotos[0])
    : null;
  const nombre = producto?.nombre ?? "Producto no disponible";
  const precio = producto ? formatearPrecioBolivianos(Number(producto.precio)) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: COLORES_MIPUESTO.superficie,
          color: COLORES_MIPUESTO.texto,
          fontFamily: "Arial, sans-serif",
        }}
      >
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            src={foto}
            style={{ width: "50%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "64px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", fontSize: 30, color: COLORES_MIPUESTO.marca, fontWeight: 800 }}>
              {(negocio?.nombre ?? "MiPuesto").slice(0, 40)}
            </div>
            <div style={{ display: "flex", fontSize: 58, fontWeight: 900, lineHeight: 1.08 }}>
              {nombre.slice(0, 70)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 900, color: COLORES_MIPUESTO.marca }}>
              {precio}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: COLORES_MIPUESTO.texto }}>
              Ver y pedir en MiPuesto
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
