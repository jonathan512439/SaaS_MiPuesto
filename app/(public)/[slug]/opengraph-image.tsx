import { ImageResponse } from "next/og";

import { COLORES_MIPUESTO } from "../../../lib/identidad-visual";
import {
  construirUrlVistaPrevia,
  obtenerFotoRasterizable,
} from "../../../lib/catalogo/vista-previa-compartida";
import { crearClienteSupabasePublico } from "../../../lib/supabase/public";
import { obtenerVariablesPublicasSupabase } from "../../../lib/supabase/variables";

export const alt = "Catálogo de negocio en MiPuesto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function ImagenCatalogo({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = crearClienteSupabasePublico();
  const { data: negocio } = await supabase
    .from("negocios")
    .select("nombre,descripcion,portada_url")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();
  const nombre = negocio?.nombre ?? "MiPuesto";
  const descripcion = negocio?.descripcion?.trim() || "Catálogos de negocios locales de Bolivia";
  const { url } = obtenerVariablesPublicasSupabase();
  /* La portada tambien se guarda en WebP, asi que pasa por el mismo camino. */
  const portada = await obtenerFotoRasterizable(
    construirUrlVistaPrevia(url, "negocios", negocio?.portada_url ?? null),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: COLORES_MIPUESTO.marca,
          color: COLORES_MIPUESTO.superficie,
          fontFamily: "Arial, sans-serif",
        }}
      >
        {portada ? (
          <img
            alt=""
            src={portada}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.22,
            }}
          />
        ) : null}
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>MiPuesto · Bolivia</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 900, lineHeight: 1.05 }}>
            {nombre}
          </div>
          <div style={{ display: "flex", maxWidth: 900, fontSize: 34, lineHeight: 1.35 }}>
            {descripcion.slice(0, 150)}
          </div>
        </div>
        <div style={{ display: "flex", color: COLORES_MIPUESTO.superficie, fontSize: 28 }}>
          Abre el catálogo y comunícate directamente con el negocio
        </div>
      </div>
    ),
    size,
  );
}
