"use client";

import { useCallback, useMemo, useState } from "react";

import type { TipoImagenIdentidad } from "../../lib/negocios/identidad";
import type { ContextoDestino } from "../../lib/negocios/destino-banner";
import type { TextoSobreImagen } from "../../lib/negocios/texto-sobre-imagen";
import { bannersParaMostrar, type VistaPreviaDelNegocio } from "../../lib/plantillas/vista-previa-del-negocio";
import { PasoNumerado } from "../dashboard/paso-numerado";
import { FormularioPortada } from "../negocios/formulario-portada";
import { ImagenesDelNegocio } from "../negocios/imagenes-del-negocio";
import { SelectorApariencia, type EleccionApariencia } from "./selector-apariencia";
import { VistaPreviaCatalogo } from "./vista-previa-catalogo";
import styles from "./panel-apariencia.module.css";

/* La pantalla de apariencia entera, con **una sola vista previa** que refleja
 * todo lo que se está editando.
 *
 * Existe por eso último. Antes cada formulario era una isla: el de la paleta
 * tenía su muestra y el del banner no tenía ninguna, así que el dueño cargaba
 * algo y se enteraba de cómo quedaba recién al abrir su catálogo en otra
 * pestaña. Acá todos escriben en la misma muestra.
 *
 * Desde el 2026-10-21 suma el logo y la portada, que estaban en «Mi negocio»,
 * con el texto de la portada justo debajo de la foto; y en escritorio los
 * ajustes van a la izquierda con la muestra fija a la derecha. En el teléfono
 * el orden es el de antes: paleta, forma y fondo, la muestra, y lo demás. Los
 * banners se editan en Promociones; acá la muestra los dibuja como están
 * guardados, porque son parte de cómo se ve el catálogo.
 */
export function PanelApariencia({
  vista,
  destinos,
  rutasImagenes,
  urlSupabase,
  negocioNombre,
}: {
  vista: VistaPreviaDelNegocio;
  destinos: ContextoDestino;
  rutasImagenes: { logo: string | null; portada: string | null };
  urlSupabase: string;
  negocioNombre: string;
}) {
  const [eleccion, setEleccion] = useState<EleccionApariencia>({
    paleta: vista.paleta,
    forma: vista.forma,
    patron: vista.patron,
    opacidad: vista.opacidad,
  });
  const [portadaTexto, setPortadaTexto] = useState<TextoSobreImagen>(vista.portadaGuardada);
  const [imagenes, setImagenes] = useState({
    logo: vista.datos.negocio.logoUrl,
    portada: vista.datos.negocio.portadaUrl,
  });

  /* Estable: el formulario de imágenes la llama después de guardar. */
  const alCambiarImagen = useCallback((tipo: TipoImagenIdentidad, url: string | null) => {
    if (tipo === "logo" || tipo === "portada") setImagenes((actuales) => ({ ...actuales, [tipo]: url }));
  }, []);

  const banners = useMemo(
    () => bannersParaMostrar(vista.bannersGuardados, vista.urlPorRuta),
    [vista.bannersGuardados, vista.urlPorRuta],
  );

  const datos = useMemo(
    () => ({
      ...vista.datos,
      negocio: {
        ...vista.datos.negocio,
        logoUrl: imagenes.logo,
        portadaUrl: imagenes.portada,
        portadaTexto,
        banners,
        /* La muestra dibuja lo que se está eligiendo, no lo guardado. */
        formaTarjeta: eleccion.forma,
        patronFondo: eleccion.patron,
        patronOpacidad: eleccion.opacidad,
      },
    }),
    [vista.datos, imagenes, portadaTexto, banners, eleccion],
  );

  return (
    <div className={styles.panel}>
      <div className={styles.ajustes}>
        {/* `setEleccion` y `setPortadaTexto` y no funciones escritas acá: los
            formularios avisan desde un efecto que depende del manejador, y una
            función nueva en cada dibujo lo volvería a disparar sin fin. Las de
            `useState` son estables por contrato. */}
        <SelectorApariencia
          alCambiar={setEleccion}
          formaInicial={vista.forma}
          opacidadInicial={vista.opacidad}
          paletaInicial={vista.paleta}
          patronInicial={vista.patron}
        />
      </div>

      <VistaPreviaCatalogo
        className={styles.vista}
        datos={datos}
        fija
        opacidad={eleccion.opacidad}
        paleta={eleccion.paleta}
        patron={eleccion.patron}
      />

      <div className={styles.marca}>
        <section aria-labelledby="titulo-logo-portada" className={styles.bloque}>
          <PasoNumerado
            descripcion="Tu logo va en la cabecera del catálogo; la portada es la foto grande de arriba. Cada una se guarda apenas la eliges."
            idTitulo="titulo-logo-portada"
            numero={4}
            titulo="Tu logo y tu portada"
          />
          <ImagenesDelNegocio
            alCambiar={alCambiarImagen}
            negocioNombre={negocioNombre}
            notas={{
              portada:
                "Es la foto de tu negocio, no un anuncio: para promociones están los banners de Promociones. Lo que va escrito encima se elige justo abajo.",
            }}
            rutasIniciales={rutasImagenes}
            tipos={["logo", "portada"]}
            urlSupabase={urlSupabase}
          />
        </section>

        <FormularioPortada
          alCambiar={setPortadaTexto}
          destinos={destinos}
          portadaInicial={vista.portadaGuardada}
          tienePortada={imagenes.portada !== null}
        />
      </div>
    </div>
  );
}
