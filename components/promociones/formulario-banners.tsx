"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import type { PaletaId } from "../../lib/apariencia";
import { prepararImagenParaSubir } from "../../lib/imagenes";
import {
  LARGO_MAXIMO_ALT,
  MAXIMO_BANNERS,
  PROPORCION_BANNER,
  type Banner,
} from "../../lib/negocios/banners";
import type { ContextoDestino } from "../../lib/negocios/destino-banner";
import {
  CamposDelCartel,
  TEXTO_VACIO,
  textoEnEdicion,
  textoGuardable,
  type TextoEnEdicion,
} from "../negocios/campos-del-cartel";
import styles from "../negocios/cartel.module.css";
import { BannerCatalogo } from "../templates/banner-catalogo";
import temaStyles from "../templates/tema-catalogo.module.css";
import { PasoNumerado } from "../dashboard/paso-numerado";
import { Boton, Formulario, useAvisos } from "../ui";

/* El banner publicitario, en Promociones.
 *
 * Es la franja con imagen que aparece en el catálogo entre dos categorías,
 * mientras el cliente recorre los productos: una promoción, una marca que se
 * vende, un aviso. Hasta el 2026-10-13 se editaba en Apariencia, en el mismo
 * formulario que el texto de la portada, y el dueño no distinguía una cosa de
 * la otra. Se mudó acá, que es lo que es, y se arma en cuatro pasos con su
 * vista previa al lado: cómo va a quedar se ve mientras se escribe.
 */

type BannerEnEdicion = TextoEnEdicion & {
  imagen: string | null;
  vistaPrevia: string | null;
  alt: string;
};

const BANNER_VACIO: BannerEnEdicion = { ...TEXTO_VACIO, imagen: null, vistaPrevia: null, alt: "" };

export function FormularioBanners({
  bannersIniciales,
  urlPorRuta,
  destinos,
  paleta,
}: {
  bannersIniciales: Array<Banner | null>;
  /* La dirección pública de cada ruta guardada, armada por el servidor. */
  urlPorRuta: Record<string, string>;
  destinos: ContextoDestino;
  /* La paleta del negocio, para que la vista previa tenga sus colores. */
  paleta: PaletaId;
}) {
  const [banners, setBanners] = useState<BannerEnEdicion[]>(() =>
    Array.from({ length: MAXIMO_BANNERS }, (_, indice) => {
      const guardado = bannersIniciales[indice];
      if (!guardado) return BANNER_VACIO;
      return {
        ...textoEnEdicion(guardado, destinos),
        imagen: guardado.imagen,
        vistaPrevia: urlPorRuta[guardado.imagen] ?? null,
        alt: guardado.alt,
      };
    }),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [subiendo, setSubiendo] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const { mostrarAviso } = useAvisos();

  function cambiarBanner(indice: number, cambio: Partial<BannerEnEdicion>) {
    setBanners((actuales) =>
      actuales.map((banner, posicion) => (posicion === indice ? { ...banner, ...cambio } : banner)),
    );
    setErrores({});
  }

  async function subirImagen(indice: number, evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    /* Se limpia antes de nada: sin esto, elegir el mismo archivo dos veces
       seguidas no dispara el evento y parece que no pasó nada. */
    evento.target.value = "";
    if (!archivo) return;

    setSubiendo(indice);
    try {
      const imagen = await prepararImagenParaSubir(archivo);
      const formulario = new FormData();
      formulario.append("archivo", imagen);
      const respuesta = await fetch("/api/negocios/banners", { method: "POST", body: formulario });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        ruta?: string;
        url?: string;
      };
      if (!respuesta.ok || !datos.ruta || !datos.url) {
        throw new Error(datos.error || "No se pudo subir la imagen.");
      }
      /* La imagen sube pero **no queda publicada**: se publica al guardar,
         con su descripción. */
      cambiarBanner(indice, { imagen: datos.ruta, vistaPrevia: datos.url });
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
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        errores?: Record<string, string>;
        banners?: Banner[];
      };
      if (!respuesta.ok || !datos.banners) {
        setErrores(datos.errores ?? {});
        throw new Error(datos.error || "No se pudo guardar.");
      }
      mostrarAviso({
        titulo: aGuardar.some((banner) => banner !== null) ? "Banner publicado" : "Banner quitado",
        variante: "exito",
      });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo guardar el banner",
        mensaje: error instanceof Error ? error.message : "Intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Formulario className={styles.seccion} onSubmit={guardar}>
      <header className={styles.cabecera}>
        <PasoNumerado icono="etiqueta" titulo="Banner publicitario" />
        <p>
          Es una franja con imagen que aparece en tu catálogo entre dos categorías, mientras tus
          clientes miran los productos. Sirve para una promoción, una marca que vendes o un aviso
          («cerramos el feriado»). Es opcional: sin banner, no queda ningún hueco.
        </p>
      </header>

      {banners.map((banner, indice) => {
        const paraMostrar: Banner | null = banner.vistaPrevia
          ? { ...textoGuardable(banner, destinos), imagen: banner.vistaPrevia, alt: banner.alt.trim() || "Banner" }
          : null;
        return (
          <fieldset className={styles.banner} disabled={guardando} key={indice}>
            <legend>Tu banner</legend>

            <section className={styles.pasoBanner} aria-labelledby={`paso-imagen-${indice}`}>
              <h3 id={`paso-imagen-${indice}`}>1 · La imagen</h3>
              <label className={styles.campo} htmlFor={`banner-imagen-${indice}`}>
                <span>Elige una foto o un diseño</span>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  disabled={subiendo !== null}
                  id={`banner-imagen-${indice}`}
                  onChange={(evento) => subirImagen(indice, evento)}
                  type="file"
                />
                <small>
                  {subiendo === indice
                    ? "Subiendo la imagen…"
                    : `Más ancha que alta: ${PROPORCION_BANNER.ancho} de ancho por ${PROPORCION_BANNER.alto} de alto, por ejemplo ${PROPORCION_BANNER.ejemplo}. Si tiene otra medida, se recorta por el medio.`}
                </small>
                {errores[`banners.${indice}.imagen`] ? (
                  <strong className={styles.error}>{errores[`banners.${indice}.imagen`]}</strong>
                ) : null}
              </label>
            </section>

            <section className={styles.pasoBanner} aria-labelledby={`paso-alt-${indice}`}>
              <h3 id={`paso-alt-${indice}`}>2 · ¿Qué muestra la imagen?</h3>
              <label className={styles.campo} htmlFor={`banner-alt-${indice}`}>
                <span>Descríbela en una frase (obligatorio)</span>
                <input
                  id={`banner-alt-${indice}`}
                  maxLength={LARGO_MAXIMO_ALT}
                  onChange={(evento) => cambiarBanner(indice, { alt: evento.target.value })}
                  placeholder="20 % de descuento en zapatillas toda la semana"
                  type="text"
                  value={banner.alt}
                />
                {/* No es un campo opcional disfrazado: es lo que escucha quien
                    usa lector de pantalla, y un banner puede ser el aviso de que
                    el negocio cierra por feriado. */}
                <small>
                  La escucha quien no puede ver la imagen, y la muestra el teléfono si la foto no
                  carga. Hasta {LARGO_MAXIMO_ALT} caracteres.
                </small>
                {errores[`banners.${indice}.alt`] ? (
                  <strong className={styles.error}>{errores[`banners.${indice}.alt`]}</strong>
                ) : null}
              </label>
            </section>

            <section className={styles.pasoBanner} aria-labelledby={`paso-texto-${indice}`}>
              <h3 id={`paso-texto-${indice}`}>3 · Texto encima y botón (opcional)</h3>
              <p className={styles.paraQue}>
                Si tu imagen ya tiene el texto, deja esto vacío. Si escribes algo, aparece sobre la
                imagen con un sombreado para que se lea.
              </p>
              <CamposDelCartel
                cambiar={(cambio) => cambiarBanner(indice, cambio)}
                destinos={destinos}
                error={errores[`banners.${indice}.enlace`]}
                prefijo={`banner-${indice}`}
                texto={banner}
              />
            </section>

            <section className={styles.pasoBanner} aria-labelledby={`paso-previa-${indice}`}>
              <h3 id={`paso-previa-${indice}`}>4 · Así se ve en tu catálogo</h3>
              <div className={`${temaStyles.tema} ${styles.previaBanner}`} data-paleta={paleta}>
                {paraMostrar ? (
                  <BannerCatalogo banner={paraMostrar} />
                ) : (
                  <span className={styles.sinImagen}>Sube una imagen para verlo.</span>
                )}
              </div>
            </section>

            {banner.imagen || banner.alt ? (
              <Boton onClick={() => cambiarBanner(indice, BANNER_VACIO)} type="button" variante="secundario">
                Quitar este banner
              </Boton>
            ) : null}
          </fieldset>
        );
      })}

      {errores.banners ? <strong className={styles.error}>{errores.banners}</strong> : null}

      <Boton cargando={guardando} type="submit">
        Guardar el banner
      </Boton>
    </Formulario>
  );
}
