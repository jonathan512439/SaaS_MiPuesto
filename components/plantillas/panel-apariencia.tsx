"use client";

import { useMemo, useState } from "react";

import type { PaletaId, PlantillaId, TarjetaId } from "../../lib/apariencia";
import type { Banner } from "../../lib/negocios/banners";
import type { DatosPlantilla } from "../../lib/plantillas/tipos";
import { FormularioBanners } from "../negocios/formulario-banners";
import { SelectorApariencia } from "./selector-apariencia";

/* La pantalla de apariencia entera, con **una sola vista previa** que refleja
 * todo lo que se está editando.
 *
 * Existe por eso último. Antes cada formulario era una isla: el de la paleta
 * tenía su muestra y el del banner no tenía ninguna, así que el dueño cargaba
 * una promoción y se enteraba de cómo quedaba recién al abrir su catálogo en
 * otra pestaña. La muestra vive arriba y los dos formularios escriben en ella.
 *
 * El estado del banner sigue viviendo en su formulario —es el que sabe subir
 * imágenes, validar y guardar— y de acá solo se escucha. Subirlo entero
 * obligaría a mover la carga de archivos a este componente para no ganar nada.
 */
export function PanelApariencia({
  datos,
  plantillaInicial,
  tarjetaInicial,
  paletaInicial,
  patronInicial,
  opacidadInicial,
  bannersIniciales,
  urlPorRuta,
}: {
  datos: DatosPlantilla;
  plantillaInicial: PlantillaId;
  tarjetaInicial: TarjetaId;
  paletaInicial: PaletaId;
  patronInicial: boolean;
  opacidadInicial: number;
  bannersIniciales: Banner[];
  urlPorRuta: Record<string, string>;
}) {
  /* Arranca con lo guardado ya resuelto a direcciones: la muestra dibuja
     imágenes, y lo que hay en la base son rutas del depósito. */
  const [bannersVista, setBannersVista] = useState<Banner[]>(() =>
    bannersIniciales.flatMap((banner) => {
      const url = urlPorRuta[banner.imagen];
      return url ? [{ ...banner, imagen: url }] : [];
    }),
  );

  const datosConBanners = useMemo(
    () => ({ ...datos, negocio: { ...datos.negocio, banners: bannersVista } }),
    [datos, bannersVista],
  );

  return (
    <>
      <SelectorApariencia
        datos={datosConBanners}
        opacidadInicial={opacidadInicial}
        paletaInicial={paletaInicial}
        patronInicial={patronInicial}
        plantillaInicial={plantillaInicial}
        tarjetaInicial={tarjetaInicial}
      />

      {/* `setBannersVista` y no una función escrita acá: el formulario avisa
          desde un efecto que depende de este manejador, y una función nueva en
          cada dibujo lo volvería a disparar sin fin. Las de `useState` son
          estables por contrato. */}
      <FormularioBanners
        alCambiar={setBannersVista}
        bannersIniciales={bannersIniciales}
        urlPorRuta={urlPorRuta}
      />
    </>
  );
}
