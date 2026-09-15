"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import { prepararImagenParaSubir } from "../../lib/imagenes";
import { MAXIMO_BANNERS, type Banner } from "../../lib/negocios/banners";
import { PasoNumerado } from "../dashboard/paso-numerado";
import { Boton, useAvisos } from "../ui";
import styles from "./formulario-banners.module.css";

/* Un banner mientras se edita. Se separa del tipo guardado por una razón: acá la
   imagen puede no estar todavía —el dueño escribe el texto y después sube la
   foto, o al revés— y `Banner` no admite eso. Mezclarlos obligaría a hacer
   opcional un campo que en la base es obligatorio. */
type BannerEnEdicion = {
  imagen: string | null;
  vistaPrevia: string | null;
  alt: string;
  eyebrow: string;
  titulo: string;
  copy: string;
  boton: string;
  enlace: string;
};

const VACIO: BannerEnEdicion = {
  imagen: null,
  vistaPrevia: null,
  alt: "",
  eyebrow: "",
  titulo: "",
  copy: "",
  boton: "",
  enlace: "",
};

/* Los dos banners del catálogo.
 *
 * El primero va entre el horario y los productos, y el segundo antes del pie.
 * Se editan los dos juntos y se guardan juntos, porque la posición es el orden:
 * mandar el segundo sin el primero dejaría un hueco que el arreglo no puede
 * representar.
 *
 * **Los dos son opcionales y es el dueño quien decide.** Un banner vacío no se
 * guarda y no deja hueco en el catálogo; para apagar uno, se lo quita.
 */
export function FormularioBanners({
  bannersIniciales,
  urlPorRuta,
  alCambiar,
}: {
  bannersIniciales: Banner[];
  /* Avisa lo que hay en el formulario ahora mismo, para que la vista previa de
     la pantalla lo dibuje mientras se escribe. La imagen va como dirección y no
     como ruta del depósito: lo que se manda acá es para mirar, no para guardar. */
  alCambiar?: (banners: Banner[]) => void;
  /* La dirección pública de cada ruta ya guardada. La arma el servidor, que es
     quien conoce la del proyecto: pedírsela al navegador sería repetir acá una
     regla que ya vive en `obtenerUrlPublicaImagenNegocio`. */
  urlPorRuta: Record<string, string>;
}) {
  const [banners, setBanners] = useState<BannerEnEdicion[]>(() =>
    Array.from({ length: MAXIMO_BANNERS }, (_, indice) => {
      const guardado = bannersIniciales[indice];
      if (!guardado) return VACIO;
      return {
        imagen: guardado.imagen,
        vistaPrevia: urlPorRuta[guardado.imagen] ?? null,
        alt: guardado.alt,
        eyebrow: guardado.eyebrow ?? "",
        titulo: guardado.titulo ?? "",
        copy: guardado.copy ?? "",
        boton: guardado.boton ?? "",
        enlace: guardado.enlace ?? "",
      };
    }),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [subiendo, setSubiendo] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const { mostrarAviso } = useAvisos();

  /* En un efecto y no dentro de `cambiar`: así la vista previa también refleja
     la imagen recién subida, que entra por otro camino. */
  useEffect(() => {
    if (!alCambiar) return;
    alCambiar(
      banners
        .filter((banner) => banner.vistaPrevia !== null)
        .map((banner) => ({
          imagen: banner.vistaPrevia ?? "",
          alt: banner.alt.trim(),
          eyebrow: banner.eyebrow.trim() || null,
          titulo: banner.titulo.trim() || null,
          copy: banner.copy.trim() || null,
          boton: banner.boton.trim() || null,
          enlace: banner.enlace.trim() || null,
        })),
    );
  }, [alCambiar, banners]);

  function cambiar(indice: number, cambio: Partial<BannerEnEdicion>) {
    setBanners((actuales) =>
      actuales.map((banner, posicion) =>
        posicion === indice ? { ...banner, ...cambio } : banner,
      ),
    );
    setErrores({});
  }

  async function subirImagen(indice: number, evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    /* Se limpia el input antes de nada: sin esto, elegir el mismo archivo dos
       veces seguidas no dispara el evento y parece que no pasó nada. */
    evento.target.value = "";
    if (!archivo) return;

    setSubiendo(indice);
    try {
      const imagen = await prepararImagenParaSubir(archivo);
      const formulario = new FormData();
      formulario.append("archivo", imagen);
      const respuesta = await fetch("/api/negocios/banners", {
        method: "POST",
        body: formulario,
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        ruta?: string;
        url?: string;
      };
      if (!respuesta.ok || !datos.ruta || !datos.url) {
        throw new Error(datos.error || "No se pudo subir la imagen.");
      }
      /* La imagen sube pero **no queda publicada**: se publica al guardar, con
         su texto alternativo. Un banner sin texto no se puede guardar, así que
         publicarlo acá dejaría en el catálogo algo que el modelo no admite. */
      cambiar(indice, { imagen: datos.ruta, vistaPrevia: datos.url });
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
      /* Los vacíos se descartan y no se mandan como huecos: el arreglo posiciona
         por orden, así que un hueco al principio correría el de abajo hacia
         arriba. Quitar el primero y dejar el segundo lo sube, que es lo que el
         dueño espera al borrar uno. */
      const aGuardar = banners
        .filter((banner) => banner.imagen !== null || banner.alt.trim() !== "")
        .map((banner) => ({
          imagen: banner.imagen ?? "",
          alt: banner.alt.trim(),
          eyebrow: banner.eyebrow.trim() || null,
          titulo: banner.titulo.trim() || null,
          copy: banner.copy.trim() || null,
          boton: banner.boton.trim() || null,
          enlace: banner.enlace.trim() || null,
        }));

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
        throw new Error(datos.error || "No se pudieron guardar los banners.");
      }
      mostrarAviso({ titulo: "Banners guardados", variante: "exito" });
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
    <form className={styles.seccion} onSubmit={guardar}>
      {/* El mismo encabezado que los tres pasos de arriba: esta sección vive en
          la misma pantalla y con un `h2` suelto se leía como si fuera de otra. */}
      <header className={styles.cabecera}>
        <PasoNumerado numero={4} titulo="Banners del catálogo" />
        <p>
          Dos franjas anchas, las dos opcionales. Si dejás una vacía, no se muestra y no
          deja hueco; y si cargás una sola, va al primer lugar. Lo que cargás acá se ve
          arriba, en la vista previa.
        </p>
      </header>

      {banners.map((banner, indice) => {
        const posicion =
          indice === 0 ? "Aviso · arriba del catálogo" : "Publicidad · a la mitad del catálogo";
        const paraQue =
          indice === 0
            ? "Se ve apenas entra tu cliente, entre el horario y tus productos. Sirve para un aviso: «cerrado el 6 de agosto», «hoy hay promo»."
            : "Se ve mientras tu cliente recorre los productos, entre dos categorías. Es el espacio de publicidad: una marca que vendes, una promocion de temporada, tu otro local.";
        return (
          <fieldset className={styles.banner} disabled={guardando} key={indice}>
            <legend>{posicion}</legend>
            <p className={styles.paraQue}>{paraQue}</p>

            <div className={styles.previa}>
              {banner.vistaPrevia ? (
                <Image
                  alt={banner.alt || "Vista previa del banner"}
                  height={150}
                  src={banner.vistaPrevia}
                  width={600}
                />
              ) : (
                <span className={styles.sinImagen}>Sin imagen</span>
              )}
            </div>

            <label className={styles.campo} htmlFor={`banner-imagen-${indice}`}>
              <span>Imagen</span>
              <input
                accept="image/jpeg,image/png,image/webp"
                disabled={subiendo !== null}
                id={`banner-imagen-${indice}`}
                onChange={(evento) => subirImagen(indice, evento)}
                type="file"
              />
              <small>
                {subiendo === indice
                  ? "Subiendo…"
                  : "Se recomienda una imagen ancha, cuatro veces más larga que alta."}
              </small>
              {errores[`banners.${indice}.imagen`] ? (
                <strong className={styles.error}>{errores[`banners.${indice}.imagen`]}</strong>
              ) : null}
            </label>

            <label className={styles.campo} htmlFor={`banner-alt-${indice}`}>
              <span>Qué dice el banner</span>
              <input
                id={`banner-alt-${indice}`}
                maxLength={120}
                onChange={(evento) => cambiar(indice, { alt: evento.target.value })}
                placeholder="20 % de descuento toda la semana"
                type="text"
                value={banner.alt}
              />
              {/* No es un campo opcional disfrazado: es lo que escucha quien usa
                  lector de pantalla, y un banner puede ser el aviso de que el
                  negocio cierra por feriado. */}
              <small>Obligatorio. Lo lee quien no puede ver la imagen.</small>
              {errores[`banners.${indice}.alt`] ? (
                <strong className={styles.error}>{errores[`banners.${indice}.alt`]}</strong>
              ) : null}
            </label>

            {/* El texto que se dibuja encima de la imagen, como en las maquetas
                de referencia. Todo opcional: un banner que es solo imagen sigue
                siendo válido. */}
            <label className={styles.campo} htmlFor={`banner-eyebrow-${indice}`}>
              <span>Antetítulo (opcional)</span>
              <input
                id={`banner-eyebrow-${indice}`}
                maxLength={40}
                onChange={(evento) => cambiar(indice, { eyebrow: evento.target.value })}
                placeholder="Solo esta semana"
                type="text"
                value={banner.eyebrow}
              />
            </label>

            <label className={styles.campo} htmlFor={`banner-titulo-${indice}`}>
              <span>Título (opcional)</span>
              <input
                id={`banner-titulo-${indice}`}
                maxLength={80}
                onChange={(evento) => cambiar(indice, { titulo: evento.target.value })}
                placeholder="20 % en toda la línea eléctrica"
                type="text"
                value={banner.titulo}
              />
            </label>

            <label className={styles.campo} htmlFor={`banner-copy-${indice}`}>
              <span>Bajada (opcional)</span>
              <input
                id={`banner-copy-${indice}`}
                maxLength={160}
                onChange={(evento) => cambiar(indice, { copy: evento.target.value })}
                placeholder="Del lunes al sábado, presentando el catálogo."
                type="text"
                value={banner.copy}
              />
            </label>

            <label className={styles.campo} htmlFor={`banner-boton-${indice}`}>
              <span>Texto del botón (opcional)</span>
              <input
                id={`banner-boton-${indice}`}
                maxLength={32}
                onChange={(evento) => cambiar(indice, { boton: evento.target.value })}
                placeholder="Ver la promoción"
                type="text"
                value={banner.boton}
              />
              <small>El botón aparece solo si además pusiste a dónde lleva.</small>
            </label>

            <label className={styles.campo} htmlFor={`banner-enlace-${indice}`}>
              <span>A dónde lleva (opcional)</span>
              <input
                id={`banner-enlace-${indice}`}
                onChange={(evento) => cambiar(indice, { enlace: evento.target.value })}
                placeholder="https://…"
                type="url"
                value={banner.enlace}
              />
              <small>Dejalo vacío si es solo un aviso.</small>
              {errores[`banners.${indice}.enlace`] ? (
                <strong className={styles.error}>{errores[`banners.${indice}.enlace`]}</strong>
              ) : null}
            </label>

            {banner.imagen || banner.alt ? (
              <Boton
                onClick={() => cambiar(indice, VACIO)}
                type="button"
                variante="secundario"
              >
                Quitar este banner
              </Boton>
            ) : null}
          </fieldset>
        );
      })}

      {errores.banners ? <strong className={styles.error}>{errores.banners}</strong> : null}

      <Boton cargando={guardando} type="submit">
        Guardar banners
      </Boton>
    </form>
  );
}
