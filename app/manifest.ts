import type { MetadataRoute } from "next";
import { COLORES_MIPUESTO } from "../lib/identidad-visual";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MiPuesto — Catálogos locales",
    short_name: "MiPuesto",
    description: "Catálogos digitales para negocios locales de Bolivia.",
    start_url: "/directorio",
    display: "standalone",
    background_color: COLORES_MIPUESTO.superficie,
    theme_color: COLORES_MIPUESTO.marca,
    lang: "es-BO",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
