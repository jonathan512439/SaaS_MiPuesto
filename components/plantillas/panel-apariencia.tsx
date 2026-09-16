"use client";

import { useMemo, useState } from "react";

import type { PaletaId } from "../../lib/apariencia";
import type { Banner } from "../../lib/negocios/banners";
import type { ContextoDestino } from "../../lib/negocios/destino-banner";
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
  paletaInicial,
  patronInicial,
  opacidadInicial,
  bannersIniciales,
  urlPorRuta,
  destinos,
}: {
  datos: DatosPlantilla;
  paletaInicial: PaletaId;
  patronInicial: boolean;
  opacidadInicial: number;
  bannersIniciales: Array<Banner | null>;
  urlPorRuta: Record<string, string>;
  destinos: ContextoDestino;
}) {
  /* Arranca con lo guardado ya resuelto a direcciones: la muestra dibuja
     imágenes, y lo que hay en la base son rutas del depósito. */
  const [bannersVista, setBannersVista] = useState<Array<Banner | null>>(() =>
    /* `map` y no `flatMap`: cada lugar conserva el suyo. Compactando, la muestra
       dibujaba arriba el banner que el dueño cargó abajo, y la vista previa
       mentía sobre su propio catálogo. */
    bannersIniciales.map((banner) => {
      if (!banner) return null;
      const url = urlPorRuta[banner.imagen];
      return url ? { ...banner, imagen: url } : null;
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
      />

      {/* `setBannersVista` y no una función escrita acá: el formulario avisa
          desde un efecto que depende de este manejador, y una función nueva en
          cada dibujo lo volvería a disparar sin fin. Las de `useState` son
          estables por contrato. */}
      <FormularioBanners
        alCambiar={setBannersVista}
        bannersIniciales={bannersIniciales}
        destinos={destinos}
        urlPorRuta={urlPorRuta}
      />
    </>
  );
}
