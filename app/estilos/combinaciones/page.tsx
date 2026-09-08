import type { Metadata } from "next";

import { HojaDeContactos } from "./hoja-de-contactos";

export const metadata: Metadata = {
  title: "Hoja de contactos | MiPuesto",
  description: "Las combinaciones de diseño y color del catálogo, juntas para compararlas.",
  /* Es una herramienta de trabajo, no una página del producto: no tiene por qué
     aparecer en una búsqueda ni en el enlace que alguien comparte. */
  robots: { index: false, follow: false },
};

export default function PaginaCombinaciones() {
  return <HojaDeContactos />;
}
