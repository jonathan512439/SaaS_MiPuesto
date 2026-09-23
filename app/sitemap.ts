import type { MetadataRoute } from "next";

import { esCiudadId } from "../lib/negocios/lugares";
import { esRubroPublicoId } from "../lib/negocios/rubros-publicos";
import { crearClienteSupabasePublico } from "../lib/supabase/public";
import { obtenerUrlBaseSitio } from "../lib/url-sitio";

export const dynamic = "force-dynamic";

/* El mapa del sitio: lo que Google tiene que encontrar. Fase 12.
 *
 * La portada, el directorio, y **solo las páginas de ciudad y de rubro que
 * tienen negocios**: una página «Juguetería en Cobija» vacía es una página que
 * Google marca como pobre y le baja el puesto a las demás. Y los catálogos de
 * los negocios que eligieron aparecer, que son los que quieren ser
 * encontrados.
 *
 * Rinde de verdad con el dominio propio: en `workers.dev` Google indexa, pero
 * nadie busca «restaurante en Oruro» y espera esa dirección.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = obtenerUrlBaseSitio();
  const ahora = new Date();
  const supabase = crearClienteSupabasePublico();
  const { data } = await supabase
    .from("negocios")
    .select("slug,ciudad,rubro_publico,rubros_secundarios")
    .eq("activo", true)
    .eq("aparece_en_directorio", true);

  const negocios = data ?? [];
  const ciudades = new Set<string>();
  const ciudadYRubro = new Set<string>();
  for (const negocio of negocios) {
    if (!esCiudadId(negocio.ciudad)) continue;
    ciudades.add(negocio.ciudad);
    for (const rubro of [negocio.rubro_publico, ...(negocio.rubros_secundarios ?? [])]) {
      if (esRubroPublicoId(rubro)) ciudadYRubro.add(`${negocio.ciudad}/${rubro}`);
    }
  }

  return [
    { url: `${base}/`, lastModified: ahora, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/directorio`, lastModified: ahora, changeFrequency: "daily", priority: 0.9 },
    ...[...ciudades].map((ciudad) => ({
      url: `${base}/directorio/${ciudad}`,
      lastModified: ahora,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...[...ciudadYRubro].map((ruta) => ({
      url: `${base}/directorio/${ruta}`,
      lastModified: ahora,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...negocios.map(({ slug }) => ({
      url: `${base}/${slug}`,
      lastModified: ahora,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
