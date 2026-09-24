import type { NextConfig } from "next";

const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
const desarrollo = process.env.NODE_ENV === "development";
const politicaContenido = [
  "default-src 'self'",
  /* Cloudflare Turnstile: su script y el marco donde verifica, al enviar un
     pedido o una reserva. `lib/turnstile-cliente.ts`. */
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${desarrollo ? " 'unsafe-eval'" : ""}`,
  "frame-src https://challenges.cloudflare.com",
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
/* El permiso de ubicación queda **abierto a nuestro propio sitio** y cerrado
   para todo lo demás (un iframe ajeno no puede pedirlo).

   Estaba cerrado en todo el sitio y abierto solo en el alta y en «Mi negocio».
   No alcanzaba: esta política se fija **una vez por documento**, y el panel
   navega sin recargar. Quien entraba por `/login` se quedaba con la política de
   `/login` —ubicación cerrada— al llegar a «Mi negocio», y el navegador
   rechazaba «Estoy en mi local» sin siquiera preguntar. El dueño lo vio así.

   Abrirla a `self` no hace que nadie pregunte nada: la ubicación la pide solo
   el código que la llama, y en todo el sitio la llaman dos botones que el
   usuario toca a propósito. */
const POLITICA_PERMISOS = "camera=(), microphone=(), geolocation=(self), browsing-topics=()";

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
          /* Las mismas fotos achicadas por Supabase: el directorio pide la
             portada a 800 de ancho y no el original. Producción no lo exigía,
             `next dev` sí, y el directorio daba error en local. */
          {
            protocol: "https",
            hostname: new URL(urlSupabase).hostname,
            pathname: "/storage/v1/render/image/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
