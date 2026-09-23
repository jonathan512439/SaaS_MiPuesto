import type { MetadataRoute } from "next";

import { RUTAS_PANEL } from "../lib/panel/rutas";
import { obtenerUrlBaseSitio } from "../lib/url-sitio";

/* Qué puede recorrer un buscador. Fase 12.
 *
 * Todo lo público, y nada del panel, del alta, de la plataforma ni de la API:
 * son pantallas con sesión, y una página de «iniciá sesión» indexada es ruido
 * en el resultado de alguien que buscaba un restaurante. */
export default function robots(): MetadataRoute.Robots {
  const base = obtenerUrlBaseSitio();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [RUTAS_PANEL.inicio, "/alta", "/plataforma", "/api/", "/login", "/actualizar-clave", "/recuperar-clave"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
