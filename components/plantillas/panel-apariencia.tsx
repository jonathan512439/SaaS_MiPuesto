"use client";

import { useMemo, useState } from "react";

import type { FormaTarjeta, PaletaId } from "../../lib/apariencia";
import type { Banner } from "../../lib/negocios/banners";
import type { ContextoDestino } from "../../lib/negocios/destino-banner";
import type { TextoSobreImagen } from "../../lib/negocios/texto-sobre-imagen";
import type { DatosPlantilla } from "../../lib/plantillas/tipos";
import {
  FormularioPortadaYBanner,
  type PortadaYBanner,
} from "../negocios/formulario-portada-y-banner";
import { SelectorApariencia } from "./selector-apariencia";

/* La pantalla de apariencia entera, con **una sola vista previa** que refleja
 * todo lo que se está editando.
 *
 * Existe por eso último. Antes cada formulario era una isla: el de la paleta
 * tenía su muestra y el del banner no tenía ninguna, así que el dueño cargaba
 * una promoción y se enteraba de cómo quedaba recién al abrir su catálogo en
 * otra pestaña. La muestra vive arriba y los dos formularios escriben en ella.
 *
 * El estado del cartel sigue viviendo en su formulario —es el que sabe subir
 * imágenes, validar y guardar— y de acá solo se escucha. Subirlo entero
 * obligaría a mover la carga de archivos a este componente para no ganar nada.
 */
export function PanelApariencia({
  datos,
  paletaInicial,
  patronInicial,
  opacidadInicial,
  formaInicial,
  portadaInicial,
  bannersIniciales,
  urlPorRuta,
  destinos,
}: {
  datos: DatosPlantilla;
  paletaInicial: PaletaId;
  patronInicial: boolean;
  opacidadInicial: number;
  formaInicial: FormaTarjeta;
  portadaInicial: TextoSobreImagen;
  bannersIniciales: Array<Banner | null>;
  urlPorRuta: Record<string, string>;
  destinos: ContextoDestino;
}) {
  /* Arranca con lo guardado ya resuelto a direcciones: la muestra dibuja
     imágenes, y lo que hay en la base son rutas del depósito. */
  const [cartel, setCartel] = useState<PortadaYBanner>(() => ({
    portada: portadaInicial,
    banners: bannersIniciales.map((banner) => {
      if (!banner) return null;
      const url = urlPorRuta[banner.imagen];
      return url ? { ...banner, imagen: url } : null;
    }),
  }));

  const datosConCartel = useMemo(
    () => ({
      ...datos,
      negocio: { ...datos.negocio, portadaTexto: cartel.portada, banners: cartel.banners },
    }),
    [datos, cartel],
  );

  return (
    <>
      <SelectorApariencia
        datos={datosConCartel}
        formaInicial={formaInicial}
        opacidadInicial={opacidadInicial}
        paletaInicial={paletaInicial}
        patronInicial={patronInicial}
      />

      {/* `setCartel` y no una función escrita acá: el formulario avisa desde
          un efecto que depende de este manejador, y una función nueva en cada
          dibujo lo volvería a disparar sin fin. Las de `useState` son estables
          por contrato. */}
      <FormularioPortadaYBanner
        alCambiar={setCartel}
        bannersIniciales={bannersIniciales}
        destinos={destinos}
        portadaInicial={portadaInicial}
        tienePortada={datos.negocio.portadaUrl !== null}
        urlPorRuta={urlPorRuta}
      />
    </>
  );
}
