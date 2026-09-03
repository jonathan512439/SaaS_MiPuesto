import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
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
    <html lang="es-BO">
      <body>{children}</body>
    </html>
  );
}
