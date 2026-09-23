import type { NextConfig } from "next";

const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
const desarrollo = process.env.NODE_ENV === "development";
const politicaContenido = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${desarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  /* Los mosaicos del mapa de la fase 11. Se ven solo en el alta y en «Mi
     negocio», pero la política es una sola para todo el sitio. Si se cambia de
     proveedor, cambia acá y en `MOSAICOS_MAPA`. */
  "img-src 'self' data: blob: https://*.supabase.co https://tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "media-src 'self' https://*.supabase.co",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");
/* El permiso de ubicación, cerrado en todo el sitio y abierto solo donde se
   pide a propósito: el alta y «Mi negocio», para el botón «Estoy en mi local».
   Un catálogo público nunca pregunta dónde está quien lo mira. */
const POLITICA_PERMISOS = "camera=(), microphone=(), geolocation=(), browsing-topics=()";
const POLITICA_PERMISOS_CON_UBICACION =
  "camera=(), microphone=(), geolocation=(self), browsing-topics=()";

const cabecerasSeguridad = [
  { key: "Content-Security-Policy", value: politicaContenido },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "Permissions-Policy", value: POLITICA_PERMISOS },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/", headers: cabecerasSeguridad },
      {
        source: "/:path*",
        headers: cabecerasSeguridad,
      },
      /* Van después de la general: cuando dos reglas ponen la misma cabecera,
         gana la última. */
      {
        source: "/alta/:path*",
        headers: [{ key: "Permissions-Policy", value: POLITICA_PERMISOS_CON_UBICACION }],
      },
      {
        source: "/dashboard/negocio",
        headers: [{ key: "Permissions-Policy", value: POLITICA_PERMISOS_CON_UBICACION }],
      },
    ];
  },
  images: {
    remotePatterns: urlSupabase
      ? [
          {
            protocol: "https",
            hostname: new URL(urlSupabase).hostname,
            pathname: "/storage/v1/object/public/productos/**",
          },
          {
            protocol: "https",
            hostname: new URL(urlSupabase).hostname,
            pathname: "/storage/v1/object/public/negocios/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
