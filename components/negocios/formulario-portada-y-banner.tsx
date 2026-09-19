"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import { prepararImagenParaSubir } from "../../lib/imagenes";
import { MAXIMO_BANNERS, PROPORCION_BANNER, type Banner } from "../../lib/negocios/banners";
import {
  armarEnlace,
  leerDestino,
  type ContextoDestino,
  type DestinoBanner,
} from "../../lib/negocios/destino-banner";
import {
  LARGO_MAXIMO_BOTON,
  LARGO_MAXIMO_COPY,
  LARGO_MAXIMO_EYEBROW,
  LARGO_MAXIMO_TITULO,
  type TextoSobreImagen,
} from "../../lib/negocios/texto-sobre-imagen";
import { RUTAS_PANEL } from "../../lib/panel/rutas";
import { PasoNumerado } from "../dashboard/paso-numerado";
import { Boton, useAvisos } from "../ui";
import styles from "./formulario-portada-y-banner.module.css";

/* Lo que se escribe encima de una imagen, mientras se edita.
 *
 * El destino se guarda **desarmado**: el tipo por un lado y, si es una
 * dirección suelta, su texto por otro. Guardar solo la URL armada obligaría a
 * deducir el tipo en cada dibujado, y elegir «mi WhatsApp» sin teléfono cargado
 * dejaría el desplegable saltando solo a otra opción. */
type TextoEnEdicion = {
  eyebrow: string;
  titulo: string;
  copy: string;
  boton: string;
  destino: DestinoBanner["tipo"];
  categoriaDestino: string;
  enlace: string;
};

/* El banner es su texto más la imagen. Se separa del tipo guardado por una
   razón: acá la imagen puede no estar todavía —el dueño escribe el texto y
   después sube la foto, o al revés— y `Banner` no admite eso. */
type BannerEnEdicion = TextoEnEdicion & {
  imagen: string | null;
  vistaPrevia: string | null;
  alt: string;
};

/* Del enlace guardado a los campos del formulario, y de vuelta. Viven acá y no
   dentro del componente porque no dependen de su estado, y así el `useState`
   inicial los puede usar sin haberse dibujado todavía. */
function desarmarDestino(
  enlace: string | null,
  contexto: ContextoDestino,
): Pick<TextoEnEdicion, "destino" | "categoriaDestino" | "enlace"> {
  const destino = leerDestino(enlace, contexto);
  return {
    destino: destino.tipo,
    categoriaDestino: destino.tipo === "categoria" ? destino.categoriaId : "",
    enlace: destino.tipo === "otra" ? destino.url : "",
  };
}

function enlaceDe(texto: TextoEnEdicion, contexto: ContextoDestino): string | null {
  if (texto.destino === "categoria") {
    return armarEnlace({ tipo: "categoria", categoriaId: texto.categoriaDestino }, contexto);
  }
  if (texto.destino === "otra") {
    return armarEnlace({ tipo: "otra", url: texto.enlace }, contexto);
  }
  return armarEnlace({ tipo: texto.destino }, contexto);
}

function textoEnEdicion(guardado: TextoSobreImagen, contexto: ContextoDestino): TextoEnEdicion {
  return {
    eyebrow: guardado.eyebrow ?? "",
    titulo: guardado.titulo ?? "",
    copy: guardado.copy ?? "",
    boton: guardado.boton ?? "",
    ...desarmarDestino(guardado.enlace, contexto),
  };
}

/* Lo que se manda a guardar y lo que se manda a la vista previa: la misma
   forma, con los vacíos en nulo. */
function textoGuardable(texto: TextoEnEdicion, contexto: ContextoDestino): TextoSobreImagen {
  return {
    eyebrow: texto.eyebrow.trim() || null,
    titulo: texto.titulo.trim() || null,
    copy: texto.copy.trim() || null,
    boton: texto.boton.trim() || null,
    enlace: enlaceDe(texto, contexto),
  };
}

const TEXTO_VACIO: TextoEnEdicion = {
  eyebrow: "",
  titulo: "",
  copy: "",
  boton: "",
  destino: "ninguno",
  categoriaDestino: "",
  enlace: "",
};

const BANNER_VACIO: BannerEnEdicion = {
  ...TEXTO_VACIO,
  imagen: null,
  vistaPrevia: null,
  alt: "",
};

export type PortadaYBanner = {
  portada: TextoSobreImagen;
  banners: Array<Banner | null>;
};

/* Los dos carteles del catálogo: el de la portada y el banner de publicidad.
 *
 * La portada es lo primero que se ve y ya está cargada desde «Mi negocio»; acá
 * se escribe lo que va encima, si es que va algo. El banner es la franja de
 * publicidad entre dos categorías, con su propia imagen.
 *
 * Había un tercer cartel —un banner entre el horario y los productos— y se
 * fue: iba a cien píxeles de la portada y eran dos franjas anchas con texto una
 * sobre otra. Lo que se podía escribir sobre él se escribe ahora sobre la
 * portada, que es lo que el dueño pidió.
 *
 * **Los dos son opcionales y es el dueño quien decide.** Sin texto, la portada
 * es la foto sola y sin cortina; sin imagen, el banner no se muestra y no deja
 * hueco. Se guardan juntos, con un solo botón, porque se editan en la misma
 * pantalla mirando la misma vista previa.
 */
export function FormularioPortadaYBanner({
  portadaInicial,
  tienePortada,
  bannersIniciales,
  urlPorRuta,
  alCambiar,
  destinos,
}: {
  portadaInicial: TextoSobreImagen;
  /* Si el negocio subió una portada. Sin ella, el texto se guarda igual pero
     no se ve en ninguna parte, y hay que decírselo al dueño en vez de dejarlo
     escribiendo para nada. */
  tienePortada: boolean;
  bannersIniciales: Array<Banner | null>;
  /* Los lugares a los que un botón puede llevar. Llegan del servidor porque
     solo él conoce el dominio del catálogo y las categorías del negocio. */
  destinos: ContextoDestino;
  /* Avisa lo que hay en el formulario ahora mismo, para que la vista previa de
     la pantalla lo dibuje mientras se escribe. La imagen del banner va como
     dirección y no como ruta del depósito: lo que se manda acá es para mirar,
     no para guardar. */
  alCambiar?: (estado: PortadaYBanner) => void;
  /* La dirección pública de cada ruta ya guardada. La arma el servidor, que es
     quien conoce la del proyecto: pedírsela al navegador sería repetir acá una
     regla que ya vive en `obtenerUrlPublicaImagenNegocio`. */
  urlPorRuta: Record<string, string>;
}) {
  const [portada, setPortada] = useState<TextoEnEdicion>(() =>
    textoEnEdicion(portadaInicial, destinos),
  );
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

  /* En un efecto y no dentro de `cambiar`: así la vista previa también refleja
     la imagen recién subida, que entra por otro camino. */
  useEffect(() => {
    if (!alCambiar) return;
    alCambiar({
      portada: textoGuardable(portada, destinos),
      banners: banners.map((banner) =>
        banner.vistaPrevia === null
          ? null
          : {
              ...textoGuardable(banner, destinos),
              imagen: banner.vistaPrevia,
              alt: banner.alt.trim(),
            },
      ),
    });
  }, [alCambiar, banners, destinos, portada]);

  function cambiarPortada(cambio: Partial<TextoEnEdicion>) {
    setPortada((actual) => ({ ...actual, ...cambio }));
    setErrores({});
  }

  function cambiarBanner(indice: number, cambio: Partial<BannerEnEdicion>) {
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
          : {
              ...textoGuardable(banner, destinos),
              imagen: banner.imagen ?? "",
              alt: banner.alt.trim(),
            },
      );

      const respuesta = await fetch("/api/negocios/banners", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ portada: textoGuardable(portada, destinos), banners: aGuardar }),
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
      mostrarAviso({ titulo: "Portada y banner guardados", variante: "exito" });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo guardar",
        mensaje: error instanceof Error ? error.message : "Intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setGuardando(false);
    }
  }

  /* Los campos del cartel, iguales para la portada y para el banner. Son los
     mismos cinco en los dos lugares, y escribirlos dos veces es tener dos
     formularios que se separan con el tiempo. */
  function camposDelCartel(
    prefijo: string,
    texto: TextoEnEdicion,
    cambiar: (cambio: Partial<TextoEnEdicion>) => void,
    claveError: string,
  ) {
    return (
      <>
        <label className={styles.campo} htmlFor={`${prefijo}-eyebrow`}>
          <span>Antetítulo (opcional)</span>
          <input
            id={`${prefijo}-eyebrow`}
            maxLength={LARGO_MAXIMO_EYEBROW}
            onChange={(evento) => cambiar({ eyebrow: evento.target.value })}
            placeholder="Solo esta semana"
            type="text"
            value={texto.eyebrow}
          />
        </label>

        <label className={styles.campo} htmlFor={`${prefijo}-titulo`}>
          <span>Título (opcional)</span>
          <input
            id={`${prefijo}-titulo`}
            maxLength={LARGO_MAXIMO_TITULO}
            onChange={(evento) => cambiar({ titulo: evento.target.value })}
            placeholder="20 % en toda la línea eléctrica"
            type="text"
            value={texto.titulo}
          />
        </label>

        <label className={styles.campo} htmlFor={`${prefijo}-copy`}>
          <span>Bajada (opcional)</span>
          <input
            id={`${prefijo}-copy`}
            maxLength={LARGO_MAXIMO_COPY}
            onChange={(evento) => cambiar({ copy: evento.target.value })}
            placeholder="Del lunes al sábado, presentando el catálogo."
            type="text"
            value={texto.copy}
          />
        </label>

        <label className={styles.campo} htmlFor={`${prefijo}-boton`}>
          <span>Texto del botón (opcional)</span>
          <input
            id={`${prefijo}-boton`}
            maxLength={LARGO_MAXIMO_BOTON}
            onChange={(evento) => cambiar({ boton: evento.target.value })}
            placeholder="Ver la promoción"
            type="text"
            value={texto.boton}
          />
          <small>El botón aparece solo si además pusiste a dónde lleva.</small>
        </label>

        <label className={styles.campo} htmlFor={`${prefijo}-destino`}>
          <span>A dónde lleva (opcional)</span>
          {/* Lugares, no direcciones. Pedirle una URL escrita a mano a un
              comerciante es pedirle que falle: no sabe que tiene que empezar
              con «https://», no conoce el ancla de su categoría, y si se
              equivoca el botón queda mudo sin decir por qué. Escribir una
              dirección sigue estando, pero como última opción. */}
          <select
            id={`${prefijo}-destino`}
            onChange={(evento) =>
              cambiar({ destino: evento.target.value as TextoEnEdicion["destino"] })
            }
            value={texto.destino}
          >
            <option value="ninguno">No lleva a ninguna parte</option>
            <option value="productos">Mis productos</option>
            {destinos.categorias.length > 0 ? (
              <option value="categoria">Una categoría de mi catálogo</option>
            ) : null}
            <option value="whatsapp">Mi WhatsApp</option>
            {/* Sin ubicación publicada no se ofrece: elegirla dejaría un
                botón que no lleva a ninguna parte sin haberlo pedido. */}
            {destinos.ubicacionUrl ? <option value="ubicacion">Cómo llegar</option> : null}
            <option value="otra">Otra dirección</option>
          </select>

          {texto.destino === "categoria" ? (
            <select
              aria-label="Qué categoría"
              onChange={(evento) => cambiar({ categoriaDestino: evento.target.value })}
              value={texto.categoriaDestino}
            >
              <option value="">Elegí una</option>
              {destinos.categorias.map(({ id, nombre }) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          ) : null}

          {texto.destino === "otra" ? (
            <input
              aria-label="La dirección"
              onChange={(evento) => cambiar({ enlace: evento.target.value })}
              placeholder="https://…"
              type="url"
              value={texto.enlace}
            />
          ) : null}

          <small>
            {texto.destino === "ninguno"
              ? "Es solo un cartel: no se toca."
              : "Tu cliente llega ahí al tocar el botón."}
          </small>
          {errores[claveError] ? <strong className={styles.error}>{errores[claveError]}</strong> : null}
        </label>
      </>
    );
  }

  return (
    <form className={styles.seccion} onSubmit={guardar}>
      {/* El mismo encabezado que los tres pasos de arriba: esta sección vive en
          la misma pantalla y con un `h2` suelto se leía como si fuera de otra. */}
      <header className={styles.cabecera}>
        <PasoNumerado numero={4} titulo="Portada y publicidad" />
        <p>
          Lo que va escrito sobre tu portada y, más abajo, un banner de publicidad. Los dos son
          opcionales: sin texto la portada se ve limpia, y sin banner no queda hueco.
        </p>
      </header>

      <fieldset className={styles.banner} disabled={guardando}>
        <legend>Portada · lo primero que se ve</legend>
        <p className={styles.paraQue}>
          Tu portada es tu primer cartel. Podés escribirle un título, una bajada y un botón; el
          sombreado para que se lea aparece solo si ponés algo.
          {tienePortada ? null : (
            <>
              {" "}
              Todavía no subiste una portada: se sube en{" "}
              <Link href={RUTAS_PANEL.negocio}>Mi negocio</Link>, y este texto se va a ver
              cuando esté.
            </>
          )}
        </p>
        {camposDelCartel("portada", portada, cambiarPortada, "portada.enlace")}
      </fieldset>

      {banners.map((banner, indice) => (
        <fieldset className={styles.banner} disabled={guardando} key={indice}>
          <legend>Publicidad · a la mitad del catálogo</legend>
          <p className={styles.paraQue}>
            Se ve mientras tu cliente recorre los productos, entre dos categorías. Es el espacio
            de publicidad: una marca que vendés, una promoción de temporada, tu otro local.
          </p>

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
                : `Proporción ${PROPORCION_BANNER.ancho}:${PROPORCION_BANNER.alto} — por ejemplo, ${PROPORCION_BANNER.ejemplo}. Otra medida se recorta por el medio.`}
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
              onChange={(evento) => cambiarBanner(indice, { alt: evento.target.value })}
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

          {camposDelCartel(
            `banner-${indice}`,
            banner,
            (cambio) => cambiarBanner(indice, cambio),
            `banners.${indice}.enlace`,
          )}

          {banner.imagen || banner.alt ? (
            <Boton
              onClick={() => cambiarBanner(indice, BANNER_VACIO)}
              type="button"
              variante="secundario"
            >
              Quitar este banner
            </Boton>
          ) : null}
        </fieldset>
      ))}

      {errores.banners ? <strong className={styles.error}>{errores.banners}</strong> : null}

      <Boton cargando={guardando} type="submit">
        Guardar portada y banner
      </Boton>
    </form>
  );
}
