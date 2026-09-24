import type { Metadata } from "next";

import {
  PantallaDirectorio,
  tituloDeDirectorio,
} from "../../components/directorio/pantalla-directorio";
import { leerFiltrosDirectorio } from "../../lib/directorio";

export const dynamic = "force-dynamic";

type Propiedades = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/* Una búsqueda libre no se indexa: son infinitas combinaciones de lo mismo. Lo
   que Google tiene que encontrar son las páginas por ciudad y por rubro, que
   tienen su propia dirección. */
export async function generateMetadata({ searchParams }: Propiedades): Promise<Metadata> {
  const parametros = await searchParams;
  const conBusqueda = Boolean(parametros.q || parametros.cerca || parametros.zona || parametros.pagina);
  return {
    title: "Directorio de negocios | MiPuesto",
    description:
      "Busca productos y negocios locales por ciudad, zona y rubro, y abre su catálogo para pedir por WhatsApp.",
    robots: conBusqueda ? { index: false, follow: true } : undefined,
  };
}

export default async function PaginaDirectorio({ searchParams }: Propiedades) {
  const filtros = leerFiltrosDirectorio(await searchParams);
  return (
    <PantallaDirectorio
      bajada="Negocios de Bolivia con su catálogo, a un mensaje de WhatsApp"
      filtros={filtros}
      ruta="/directorio"
      titulo={tituloDeDirectorio(filtros)}
    />
  );
}
