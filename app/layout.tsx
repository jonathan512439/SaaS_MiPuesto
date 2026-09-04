import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { PieSitio } from "../components/sitio/pie-sitio";
import "./globals.css";

/* El logotipo usa una sans geometrica y gruesa. Inter no la imita: se mantiene
   neutra al lado, que es lo que pide DESIGN.md seccion 4, y aporta lo que el
   logotipo no tiene que resolver — altura de x alta para pantallas de gama
   media a plena luz, y cifras tabulares para que los precios alineen. */
const fuenteProducto = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--fuente-producto",
});
import { obtenerUrlBaseSitio } from "../lib/url-sitio";

export const metadata: Metadata = {
  metadataBase: new URL(obtenerUrlBaseSitio()),
  title: "MiPuesto",
  description: "Catálogos digitales para negocios locales de Bolivia.",
  applicationName: "MiPuesto",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html className={fuenteProducto.variable} lang="es-BO">
      <body>
        {children}
        <PieSitio />
      </body>
    </html>
  );
}
