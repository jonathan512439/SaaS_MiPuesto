import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  PantallaDirectorio,
  tituloDeDirectorio,
} from "../../../components/directorio/pantalla-directorio";
import { leerFiltrosDirectorio } from "../../../lib/directorio";
import { esCiudadId, nombreDeCiudad } from "../../../lib/negocios/lugares";

export const dynamic = "force-dynamic";

type Propiedades = {
  params: Promise<{ ciudad: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/* «Negocios en Oruro»: la página que encuentra quien busca en Google. */
export async function generateMetadata({ params }: Propiedades): Promise<Metadata> {
  const { ciudad } = await params;
  if (!esCiudadId(ciudad)) return {};
  const nombre = nombreDeCiudad(ciudad);
  return {
    title: `Negocios en ${nombre} | MiPuesto`,
    description: `Catálogos de negocios de ${nombre}: buscá productos por zona y rubro, y pedí por WhatsApp.`,
    alternates: { canonical: `/directorio/${ciudad}` },
  };
}

export default async function PaginaCiudad({ params, searchParams }: Propiedades) {
  const { ciudad } = await params;
  if (!esCiudadId(ciudad)) notFound();
  const filtros = leerFiltrosDirectorio(await searchParams, { ciudad });
  return (
    <PantallaDirectorio
      bajada={`Negocios de ${nombreDeCiudad(ciudad)} con su catálogo`}
      filtros={filtros}
      ruta={`/directorio/${ciudad}`}
      titulo={tituloDeDirectorio(filtros)}
    />
  );
}
