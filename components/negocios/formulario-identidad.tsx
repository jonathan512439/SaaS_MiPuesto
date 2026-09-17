"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import { prepararImagenParaSubir } from "../../lib/imagenes";
import {
  obtenerRedesSociales,
  type RedesSocialesNegocio,
  type TipoImagenIdentidad,
} from "../../lib/negocios/identidad";
import { obtenerUrlPublicaImagenNegocio } from "../../lib/negocios/imagenes-publicas";
import { Boton, useAvisos, useConfirmacion } from "../ui";
import styles from "./formulario-identidad.module.css";
import { AYUDA_LOGO, AYUDA_PORTADA, AYUDA_QR } from "../../lib/ayudas-formularios";

export type IdentidadNegocioInicial = {
  logo_url: string | null;
  portada_url: string | null;
  qr_pago_url: string | null;
  redes_sociales: unknown;
  ubicacion_url: string | null;
  resenas_url: string | null;
};

type Propiedades = {
  identidadInicial: IdentidadNegocioInicial;
  negocioNombre: string;
  urlSupabase: string;
};

type Imagenes = Record<TipoImagenIdentidad, { ruta: string | null; url: string | null }>;

const TIPOS: Array<{
  tipo: TipoImagenIdentidad;
  titulo: string;
  ayuda: string;
}> = [
  {
    tipo: "portada",
    titulo: "Foto de portada",
    ayuda: AYUDA_PORTADA,
  },
  {
    tipo: "logo",
    titulo: "Logo o foto de perfil",
    ayuda: AYUDA_LOGO,
  },
  {
    tipo: "qr",
    titulo: "QR de cobro",
    ayuda: AYUDA_QR,
  },
];

function valoresIniciales(identidad: IdentidadNegocioInicial, urlSupabase: string): Imagenes {
  return {
    logo: {
      ruta: identidad.logo_url,
      url: obtenerUrlPublicaImagenNegocio(urlSupabase, identidad.logo_url),
    },
    portada: {
      ruta: identidad.portada_url,
      url: obtenerUrlPublicaImagenNegocio(urlSupabase, identidad.portada_url),
    },
    qr: {
      ruta: identidad.qr_pago_url,
      url: obtenerUrlPublicaImagenNegocio(urlSupabase, identidad.qr_pago_url),
    },
  };
}

export function FormularioIdentidad({
  identidadInicial,
  negocioNombre,
  urlSupabase,
}: Propiedades) {
  const [imagenes, setImagenes] = useState(() => valoresIniciales(identidadInicial, urlSupabase));
  const [ubicacion, setUbicacion] = useState(identidadInicial.ubicacion_url ?? "");
  const [resenas, setResenas] = useState(identidadInicial.resenas_url ?? "");
  const [redes, setRedes] = useState<RedesSocialesNegocio>(() =>
    obtenerRedesSociales(identidadInicial.redes_sociales),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();
  const [ocupado, setOcupado] = useState<TipoImagenIdentidad | "redes" | "">("");

  function actualizarRed(campo: keyof RedesSocialesNegocio, valor: string) {
    setRedes((actuales) => ({ ...actuales, [campo]: valor }));
    setErrores((actuales) => ({ ...actuales, [campo]: "" }));
  }

  async function subirImagen(tipo: TipoImagenIdentidad, evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;
    setOcupado(tipo);
    try {
      const imagen = await prepararImagenParaSubir(archivo);
      const formulario = new FormData();
      formulario.append("tipo", tipo);
      formulario.append("archivo", imagen);
      const respuesta = await fetch("/api/negocios/identidad", {
        method: "POST",
        body: formulario,
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        imagen?: { tipo: TipoImagenIdentidad; ruta: string; url: string };
      };
      if (!respuesta.ok || !datos.imagen) {
        throw new Error(datos.error || "No se pudo guardar la imagen.");
      }
      const imagenGuardada = datos.imagen;
      setImagenes((actuales) => ({
        ...actuales,
        [tipo]: { ruta: imagenGuardada.ruta, url: imagenGuardada.url },
      }));
      mostrarAviso({
        titulo: tipo === "qr" ? "QR de cobro guardado" : "Imagen guardada",
        variante: "exito",
      });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo guardar la imagen",
        mensaje:
          error instanceof Error ? error.message : "Revisa tu conexión e intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setOcupado("");
    }
  }

  async function borrarImagen(tipo: TipoImagenIdentidad) {
    const aceptado = await confirmar({
      titulo: "Quitar esta imagen",
      descripcion: "Deja de verse en tu catálogo público.",
      destructiva: true,
      textoAccion: "Quitar imagen",
    });
    if (!aceptado) return;
    setOcupado(tipo);
    try {
      const respuesta = await fetch("/api/negocios/identidad", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo quitar la imagen.");
      setImagenes((actuales) => ({ ...actuales, [tipo]: { ruta: null, url: null } }));
      mostrarAviso({ titulo: "Imagen quitada", variante: "exito" });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo quitar la imagen",
        mensaje:
          error instanceof Error ? error.message : "Revisa tu conexión e intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setOcupado("");
    }
  }

  async function guardarRedes(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrores({});
    setOcupado("redes");
    try {
      const respuesta = await fetch("/api/negocios/identidad", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redes_sociales: redes,
          resenas_url: resenas,
          ubicacion_url: ubicacion,
        }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        errores?: Record<string, string>;
        identidad?: {
          redes_sociales: unknown;
          ubicacion_url: string | null;
          resenas_url: string | null;
        };
      };
      if (!respuesta.ok || !datos.identidad) {
        setErrores(datos.errores ?? {});
        throw new Error(datos.error || "No se pudieron guardar los enlaces.");
      }
      setRedes(obtenerRedesSociales(datos.identidad.redes_sociales));
      setUbicacion(datos.identidad.ubicacion_url ?? "");
      setResenas(datos.identidad.resenas_url ?? "");
      mostrarAviso({ titulo: "Enlaces guardados", variante: "exito" });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudieron guardar los enlaces",
        mensaje:
          error instanceof Error ? error.message : "Revisa tu conexión e intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setOcupado("");
    }
  }

  return (
    <section className={styles.seccion} aria-labelledby="identidad-negocio">
      <header className={styles.cabecera}>
        <div>
          <p>Fachada digital</p>
          <h2 id="identidad-negocio">Imágenes y contacto de {negocioNombre}</h2>
        </div>
        <p>Los cambios aparecen en el catálogo sin alterar productos ni pedidos.</p>
      </header>

      <div className={styles.portadaPrevia}>
        {imagenes.portada.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={`Portada de ${negocioNombre}`} src={imagenes.portada.url} />
        ) : (
          <span>La portada aparecerá aquí</span>
        )}
        <div className={styles.logoPrevio}>
          {imagenes.logo.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={`Logo de ${negocioNombre}`} src={imagenes.logo.url} />
          ) : (
            <span aria-hidden="true">{negocioNombre.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
      </div>

      <div className={styles.imagenes}>
        {TIPOS.map(({ tipo, titulo, ayuda }) => (
          <article key={tipo} className={styles.imagenFila}>
            <div>
              <h3>{titulo}</h3>
              <p>{ayuda}</p>
            </div>
            {tipo === "qr" && imagenes.qr.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.qrPrevio} alt={`QR de cobro de ${negocioNombre}`} src={imagenes.qr.url} />
            ) : null}
            <div className={styles.accionesImagen}>
              <label className={styles.botonArchivo}>
                {imagenes[tipo].ruta ? "Reemplazar imagen" : "Elegir imagen"}
                <input
                  accept="image/jpeg,image/png,image/webp"
                  disabled={Boolean(ocupado)}
                  onChange={(evento) => void subirImagen(tipo, evento)}
                  type="file"
                />
              </label>
              {imagenes[tipo].ruta ? (
                <Boton disabled={Boolean(ocupado)} onClick={() => void borrarImagen(tipo)} variante="peligro">
                  Quitar imagen
                </Boton>
              ) : null}
              {ocupado === tipo ? <span className={styles.cargando}>Preparando imagen…</span> : null}
            </div>
          </article>
        ))}
      </div>

      <form className={styles.redes} onSubmit={guardarRedes}>
        <header>
          <h3>Contacto y ubicación</h3>
          <p>Pega el enlace completo que comienza con https://. Todos son opcionales.</p>
        </header>

        {/* Se pide el enlace del mapa y no una dirección escrita: en un barrio
            boliviano una dirección rara vez lleva a la puerta, y el punto que el
            propio dueño verificó sí. */}
        <label className={styles.campoUbicacion}>
          Enlace del mapa
          <input
            inputMode="url"
            maxLength={300}
            onChange={(evento) => setUbicacion(evento.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            type="url"
            value={ubicacion}
          />
          <small className={styles.ayudaUbicacion}>
            Abrí Google Maps, buscá tu negocio, tocá «Compartir» y pegá acá el enlace. Tus
            clientes verán un botón «Cómo llegar».
          </small>
          {errores.ubicacion_url ? <small>{errores.ubicacion_url}</small> : null}
        </label>
        <label className={styles.campoUbicacion}>
          Enlace para calificarte en Google
          <input
            inputMode="url"
            maxLength={300}
            onChange={(evento) => setResenas(evento.target.value)}
            placeholder="https://g.page/r/..."
            type="url"
            value={resenas}
          />
          {/* Los pasos van acá y no en un manual aparte: el dueño necesita
              sacar ese enlace **mientras** está mirando este campo, y un enlace
              de Maps que no es el de calificar se pega igual y no falla —lleva a
              ver la ficha en vez de a puntuarla, y nadie se entera—. */}
          <small className={styles.ayudaUbicacion}>
            Se lo mostramos a tu cliente al terminar el pedido, que es cuando está
            contento y con el teléfono en la mano.
          </small>
          {/* «Desde una computadora» va primero y no como aclaración al final:
              en el teléfono, Maps abre su aplicación en vez del navegador y no
              hay barra de direcciones de donde copiar. Quien lo intente ahí se
              queda trabado sin entender por qué. */}
          <ol className={styles.pasosResenas}>
            <li>
              <strong>Desde una computadora</strong>, abrí Google Maps y buscá tu
              negocio.
            </li>
            <li>Hacé clic en tu ficha y bajá hasta «Reseñas».</li>
            <li>Hacé clic en «Escribe una reseña».</li>
            <li>Copiá la dirección que se abre y pegala acá.</li>
          </ol>
          <small className={styles.ayudaUbicacion}>
            No sirve el enlace de «Compartir»: ese lleva a ver tu ficha, no a
            calificarla.
          </small>
          {errores.resenas_url ? <small>{errores.resenas_url}</small> : null}
        </label>
        <div className={styles.camposRedes}>
          {([
            ["facebook", "Facebook"],
            ["instagram", "Instagram"],
            ["tiktok", "TikTok"],
            ["sitio_web", "Sitio web"],
          ] as const).map(([campo, etiqueta]) => (
            <label key={campo}>
              {etiqueta}
              <input
                inputMode="url"
                maxLength={300}
                onChange={(evento) => actualizarRed(campo, evento.target.value)}
                placeholder={`https://${campo === "sitio_web" ? "tu-sitio.com" : `${campo}.com/tu-negocio`}`}
                type="url"
                value={redes[campo] ?? ""}
              />
              {errores[campo] ? <small>{errores[campo]}</small> : null}
            </label>
          ))}
        </div>
        <Boton cargando={ocupado === "redes"} type="submit">Guardar enlaces</Boton>
      </form>

    </section>
  );
}
