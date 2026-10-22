"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { AYUDA_BANNER, RESUMEN_IMAGEN } from "../../lib/ayudas-formularios";
import { prepararImagenParaSubir } from "../../lib/imagenes";
import {
  LARGO_MAXIMO_ALT,
  LUGAR_BANNER,
  MAXIMO_BANNERS,
  type Banner,
  type LugarBanner,
} from "../../lib/negocios/banners";
import type { ContextoDestino } from "../../lib/negocios/destino-banner";
import type { VistaPreviaDelNegocio } from "../../lib/plantillas/vista-previa-del-negocio";
import {
  CamposDelCartel,
  TEXTO_VACIO,
  textoEnEdicion,
  textoGuardable,
  type TextoEnEdicion,
} from "../negocios/campos-del-cartel";
import cartel from "../negocios/cartel.module.css";
import { VistaPreviaCatalogo } from "../plantillas/vista-previa-catalogo";
import { BannerCatalogo } from "../templates/banner-catalogo";
import temaStyles from "../templates/tema-catalogo.module.css";
import { PasoNumerado } from "../dashboard/paso-numerado";
import { AyudaPlegable, Boton, Formulario, useAvisos } from "../ui";
import styles from "./formulario-banners.module.css";

/* Los dos banners de publicidad, en Promociones.
 *
 * Son franjas con imagen entre los productos del catálogo: una promoción, una
 * marca que se vende, un aviso. Desde el 2026-10-21 son dos, cada uno con su
 * lugar (`LUGAR_BANNER`), y se editan en dos bloques separados que dicen dónde
 * aparece cada uno: con un solo bloque y un solo nombre, «el banner», el dueño
 * no sabía cuál estaba tocando ni dónde iba a salir.
 *
 * Al costado —en escritorio, fija— va la vista previa del catálogo entero con
 * los dos banners como se están armando, la misma de Apariencia.
 */

type BannerEnEdicion = TextoEnEdicion & {
  imagen: string | null;
  vistaPrevia: string | null;
  alt: string;
};

const BANNER_VACIO: BannerEnEdicion = { ...TEXTO_VACIO, imagen: null, vistaPrevia: null, alt: "" };

/* En el orden en que aparecen en el catálogo, que no es el de la lista
   guardada: el superior está en el lugar 1 para no mudar el banner que los
   negocios ya tenían en el 0. */
const LUGARES: ReadonlyArray<{ lugar: LugarBanner; titulo: string; donde: string; paraQue: string }> = [
  {
    lugar: "superior",
    titulo: "Banner superior",
    donde: "Debajo de las categorías, arriba de tus primeros productos.",
    paraQue: "Para tu promoción principal.",
  },
  {
    lugar: "inferior",
    titulo: "Banner inferior",
    donde: "A la mitad del catálogo, entre dos categorías.",
    paraQue: "Para un aviso o una segunda promoción.",
  },
];

export function FormularioBanners({
  vista,
  destinos,
}: {
  /* La vista previa del negocio, con los banners guardados y la dirección de
     cada imagen. */
  vista: VistaPreviaDelNegocio;
  destinos: ContextoDestino;
}) {
  const [banners, setBanners] = useState<BannerEnEdicion[]>(() =>
    Array.from({ length: MAXIMO_BANNERS }, (_, indice) => {
      const guardado = vista.bannersGuardados[indice];
      if (!guardado) return BANNER_VACIO;
      return {
        ...textoEnEdicion(guardado, destinos),
        imagen: guardado.imagen,
        vistaPrevia: vista.urlPorRuta[guardado.imagen] ?? null,
        alt: guardado.alt,
      };
    }),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [subiendo, setSubiendo] = useState<LugarBanner | null>(null);
  const [guardando, setGuardando] = useState(false);
  const { mostrarAviso } = useAvisos();

  /* Cada banner como lo dibuja el catálogo, o nada si todavía no tiene imagen. */
  const paraMostrar = useMemo(
    () =>
      banners.map((banner): Banner | null =>
        banner.vistaPrevia
          ? { ...textoGuardable(banner, destinos), imagen: banner.vistaPrevia, alt: banner.alt.trim() || "Banner" }
          : null,
      ),
    [banners, destinos],
  );

  const datos = useMemo(
    () => ({ ...vista.datos, negocio: { ...vista.datos.negocio, banners: paraMostrar } }),
    [vista.datos, paraMostrar],
  );

  function cambiarBanner(lugar: LugarBanner, cambio: Partial<BannerEnEdicion>) {
    const indice = LUGAR_BANNER[lugar];
    setBanners((actuales) =>
      actuales.map((banner, posicion) => (posicion === indice ? { ...banner, ...cambio } : banner)),
    );
    setErrores({});
  }

  async function subirImagen(lugar: LugarBanner, evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    /* Se limpia antes de nada: sin esto, elegir el mismo archivo dos veces
       seguidas no dispara el evento y parece que no pasó nada. */
    evento.target.value = "";
    if (!archivo) return;

    setSubiendo(lugar);
    try {
      const imagen = await prepararImagenParaSubir(archivo);
      const formulario = new FormData();
      formulario.append("archivo", imagen);
      const respuesta = await fetch("/api/negocios/banners", { method: "POST", body: formulario });
      const datosRespuesta = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        ruta?: string;
        url?: string;
      };
      if (!respuesta.ok || !datosRespuesta.ruta || !datosRespuesta.url) {
        throw new Error(datosRespuesta.error || "No se pudo subir la imagen.");
      }
      /* La imagen sube pero **no queda publicada**: se publica al guardar,
         con su descripción. */
      cambiarBanner(lugar, { imagen: datosRespuesta.ruta, vistaPrevia: datosRespuesta.url });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo subir la imagen",
        mensaje: error instanceof Error ? error.message : "Intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setSubiendo(null);
    }
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setErrores({});
    try {
      /* Un banner vacío se manda como hueco, no se descarta: el lugar sigue
         siendo ese lugar. */
      const aGuardar = banners.map((banner) =>
        banner.imagen === null && banner.alt.trim() === ""
          ? null
          : { ...textoGuardable(banner, destinos), imagen: banner.imagen ?? "", alt: banner.alt.trim() },
      );
      const respuesta = await fetch("/api/negocios/banners", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ banners: aGuardar }),
      });
      const datosRespuesta = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        errores?: Record<string, string>;
        banners?: Banner[];
      };
      if (!respuesta.ok || !datosRespuesta.banners) {
        setErrores(datosRespuesta.errores ?? {});
        throw new Error(datosRespuesta.error || "No se pudo guardar.");
      }
      mostrarAviso({
        titulo: aGuardar.some((banner) => banner !== null) ? "Banners guardados" : "Banners quitados",
        variante: "exito",
      });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudieron guardar los banners",
        mensaje: error instanceof Error ? error.message : "Intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={styles.banners}>
      <Formulario className={`${cartel.seccion} ${styles.formulario}`} onSubmit={guardar}>
        <header className={cartel.cabecera}>
          <PasoNumerado icono="etiqueta" titulo="Tus banners" />
          <p>
            Franjas con imagen entre tus productos: una promoción, una marca o un aviso. Las dos son
            opcionales.
          </p>
          {/* El catálogo de arriba abajo, con los dos lugares marcados: dice
              dónde va cada banner antes de leer los bloques. */}
          <ol aria-label="Dónde va cada banner en tu catálogo" className={styles.esquema}>
            <li>Portada y categorías</li>
            <li className={styles.esquemaBanner}>Banner superior</li>
            <li>Tus primeros productos</li>
            <li className={styles.esquemaBanner}>Banner inferior</li>
            <li>El resto de tus productos</li>
          </ol>
        </header>

        {LUGARES.map(({ lugar, titulo, donde, paraQue }) => {
          const indice = LUGAR_BANNER[lugar];
          const banner = banners[indice];
          const muestra = paraMostrar[indice];
          const error = (campo: string) => errores[`banners.${indice}.${campo}`];
          return (
            <fieldset className={`${cartel.banner} ${styles.lugar}`} disabled={guardando} key={lugar}>
              <legend className={styles.titulo}>{titulo}</legend>
              <p className={styles.donde}>
                <strong>{donde}</strong> {paraQue}
              </p>

              <section className={cartel.pasoBanner} aria-labelledby={`paso-imagen-${lugar}`}>
                <h3 id={`paso-imagen-${lugar}`}>1 · La imagen</h3>
                <label className={cartel.campo} htmlFor={`banner-imagen-${lugar}`}>
                  <span>Elige una foto o un diseño</span>
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    disabled={subiendo !== null}
                    id={`banner-imagen-${lugar}`}
                    onChange={(evento) => subirImagen(lugar, evento)}
                    type="file"
                  />
                  {/* La forma y el tamaño a la vista; el instructivo entero, a un
                      toque. */}
                  {subiendo === lugar ? (
                    <small>Subiendo la imagen…</small>
                  ) : (
                    <AyudaPlegable resumen={RESUMEN_IMAGEN.banner} titulo="Cómo preparar la imagen">
                      {AYUDA_BANNER}
                    </AyudaPlegable>
                  )}
                  {error("imagen") ? <strong className={cartel.error}>{error("imagen")}</strong> : null}
                </label>
              </section>

              <section className={cartel.pasoBanner} aria-labelledby={`paso-alt-${lugar}`}>
                <h3 id={`paso-alt-${lugar}`}>2 · ¿Qué muestra la imagen?</h3>
                <label className={cartel.campo} htmlFor={`banner-alt-${lugar}`}>
                  <span>Descríbela en una frase (obligatorio)</span>
                  <input
                    id={`banner-alt-${lugar}`}
                    maxLength={LARGO_MAXIMO_ALT}
                    onChange={(evento) => cambiarBanner(lugar, { alt: evento.target.value })}
                    placeholder="20 % de descuento en zapatillas toda la semana"
                    type="text"
                    value={banner.alt}
                  />
                  {/* No es un campo opcional disfrazado: es lo que escucha quien
                      usa lector de pantalla, y un banner puede ser el aviso de
                      que el negocio cierra por feriado. */}
                  <small>
                    Para quien no puede ver la imagen. {banner.alt.length} de {LARGO_MAXIMO_ALT}
                  </small>
                  {error("alt") ? <strong className={cartel.error}>{error("alt")}</strong> : null}
                </label>
              </section>

              <section className={cartel.pasoBanner} aria-labelledby={`paso-texto-${lugar}`}>
                <h3 id={`paso-texto-${lugar}`}>3 · Texto encima y botón (opcional)</h3>
                <p className={cartel.paraQue}>Si tu imagen ya tiene el texto, deja esto vacío.</p>
                <CamposDelCartel
                  cambiar={(cambio) => cambiarBanner(lugar, cambio)}
                  destinos={destinos}
                  error={error("enlace")}
                  prefijo={`banner-${lugar}`}
                  texto={banner}
                />
              </section>

              <section className={cartel.pasoBanner} aria-labelledby={`paso-previa-${lugar}`}>
                <h3 id={`paso-previa-${lugar}`}>4 · Así se ve</h3>
                <div className={`${temaStyles.tema} ${cartel.previaBanner}`} data-paleta={vista.paleta}>
                  {muestra ? (
                    <BannerCatalogo banner={muestra} />
                  ) : (
                    <span className={cartel.sinImagen}>Sube una imagen para verlo.</span>
                  )}
                </div>
              </section>

              {banner.imagen || banner.alt ? (
                <Boton onClick={() => cambiarBanner(lugar, BANNER_VACIO)} type="button" variante="secundario">
                  Quitar el {titulo.toLowerCase()}
                </Boton>
              ) : null}
            </fieldset>
          );
        })}

        {errores.banners ? <strong className={cartel.error}>{errores.banners}</strong> : null}

        <Boton cargando={guardando} type="submit">
          Guardar los banners
        </Boton>
      </Formulario>

      <VistaPreviaCatalogo
        className={styles.vista}
        datos={datos}
        descripcion="Con tus dos banners como los estás armando. Se publican al guardar."
        fija
        opacidad={vista.opacidad}
        paleta={vista.paleta}
        patron={vista.patron}
      />
    </div>
  );
}
