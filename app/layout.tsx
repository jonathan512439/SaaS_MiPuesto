import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "MiPuesto",
  description: "Catálogos digitales para negocios locales de Bolivia.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-BO">
      <body>{children}</body>
    </html>
  );
}

