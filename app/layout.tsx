import type { Metadata } from "next";
import { Fraunces, Inter, Outfit } from "next/font/google";
import type { ReactNode } from "react";

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

/* La tipografía de los títulos de MiPuesto.
 *
 * Geométrica y de trazo parejo, que es lo que hace el logotipo: puestos uno al
 * lado del otro, el nombre y el título de la pantalla se leen como de la misma
 * casa. Inter sigue siendo la del texto, donde manda la legibilidad a cuerpo
 * chico y las cifras tabulares que alinean los precios; una geométrica leída en
 * párrafos largos cansa.
 *
 * **No se usa en los catálogos.** Ahí manda la plantilla que eligió el dueño
 * —la Clásica trae su propia serif— y esa es su identidad, no la nuestra.
 * Meter la fuente de MiPuesto en el catálogo de un cliente sería firmarle la
 * vidriera.
 *
 * Es una variable, así que un solo archivo cubre todos los grosores en vez de
 * pedir uno por peso. Va con `swap` para que el título se lea con la fuente del
 * sistema mientras llega: en una conexión lenta, texto tarde es peor que texto
 * con otra letra. */
const fuenteTitulo = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--fuente-titulo",
});

const fuenteMarca = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--fuente-marca",
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
    <html
      className={`${fuenteProducto.variable} ${fuenteTitulo.variable} ${fuenteMarca.variable}`}
      lang="es-BO"
    >
      <body>{children}</body>
    </html>
  );
}
