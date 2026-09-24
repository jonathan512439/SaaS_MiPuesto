import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  PantallaDirectorio,
  tituloDeDirectorio,
} from "../../../../components/directorio/pantalla-directorio";
import { leerFiltrosDirectorio } from "../../../../lib/directorio";
import { esCiudadId, nombreDeCiudad } from "../../../../lib/negocios/lugares";
import { esRubroPublicoId, nombreDeRubroPublico } from "../../../../lib/negocios/rubros-publicos";

export const dynamic = "force-dynamic";

type Propiedades = {
  params: Promise<{ ciudad: string; rubro: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/* «Restaurante en Oruro»: es lo que más clientes puede traer, porque es lo que
   la gente escribe en Google. */
export async function generateMetadata({ params }: Propiedades): Promise<Metadata> {
  const { ciudad, rubro } = await params;
  if (!esCiudadId(ciudad) || !esRubroPublicoId(rubro)) return {};
  const nombreRubro = nombreDeRubroPublico(rubro);
  const nombreCiudad = nombreDeCiudad(ciudad);
  return {
    title: `${nombreRubro} en ${nombreCiudad} | MiPuesto`,
    description: `${nombreRubro} en ${nombreCiudad}: mira sus catálogos, sus precios y pide por WhatsApp.`,
    alternates: { canonical: `/directorio/${ciudad}/${rubro}` },
  };
}

export default async function PaginaCiudadRubro({ params, searchParams }: Propiedades) {
  const { ciudad, rubro } = await params;
  if (!esCiudadId(ciudad) || !esRubroPublicoId(rubro)) notFound();
  const filtros = leerFiltrosDirectorio(await searchParams, { ciudad, rubro });
  return (
    <PantallaDirectorio
      bajada="Mira su catálogo y pide por WhatsApp"
      filtros={filtros}
      rubroEnRuta
      ruta={`/directorio/${ciudad}/${rubro}`}
      titulo={tituloDeDirectorio(filtros)}
    />
  );
}
