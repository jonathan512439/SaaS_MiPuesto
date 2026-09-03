"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import { prepararImagenParaSubir } from "../../lib/imagenes";
import {
  obtenerRedesSociales,
  type RedesSocialesNegocio,
  type TipoImagenIdentidad,
} from "../../lib/negocios/identidad";
import { obtenerUrlPublicaImagenNegocio } from "../../lib/negocios/imagenes-publicas";
import { Boton } from "../ui/boton";
import styles from "./formulario-identidad.module.css";

export type IdentidadNegocioInicial = {
  logo_url: string | null;
  portada_url: string | null;
  qr_pago_url: string | null;
  redes_sociales: unknown;
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
    ayuda: "Una imagen horizontal que presenta tu negocio al abrir el catálogo.",
  },
  {
    tipo: "logo",
    titulo: "Logo o foto de perfil",
    ayuda: "Usa una imagen cuadrada y fácil de reconocer en tamaño pequeño.",
  },
  {
    tipo: "qr",
    titulo: "QR de cobro",
    ayuda: "Se mostrará antes de confirmar una reserva. La imagen debe poder escanearse con claridad.",
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
  const [redes, setRedes] = useState<RedesSocialesNegocio>(() =>
    obtenerRedesSociales(identidadInicial.redes_sociales),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");
  const [errorGeneral, setErrorGeneral] = useState("");
  const [ocupado, setOcupado] = useState<TipoImagenIdentidad | "redes" | "">("");

  function actualizarRed(campo: keyof RedesSocialesNegocio, valor: string) {
    setRedes((actuales) => ({ ...actuales, [campo]: valor }));
    setErrores((actuales) => ({ ...actuales, [campo]: "" }));
  }

  async function subirImagen(tipo: TipoImagenIdentidad, evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;
    setMensaje("");
    setErrorGeneral("");
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
      setMensaje(tipo === "qr" ? "QR de cobro guardado." : "Imagen del negocio guardada.");
    } catch (error) {
      setErrorGeneral(error instanceof Error ? error.message : "No se pudo guardar la imagen.");
    } finally {
      setOcupado("");
    }
  }

  async function borrarImagen(tipo: TipoImagenIdentidad) {
    if (!window.confirm("¿Quitar esta imagen del negocio?")) return;
    setMensaje("");
    setErrorGeneral("");
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
      setMensaje("Imagen quitada del negocio.");
    } catch (error) {
      setErrorGeneral(error instanceof Error ? error.message : "No se pudo quitar la imagen.");
    } finally {
      setOcupado("");
    }
  }

  async function guardarRedes(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje("");
    setErrorGeneral("");
    setErrores({});
    setOcupado("redes");
    try {
      const respuesta = await fetch("/api/negocios/identidad", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redes_sociales: redes }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        errores?: Record<string, string>;
        identidad?: { redes_sociales: unknown };
      };
      if (!respuesta.ok || !datos.identidad) {
        setErrores(datos.errores ?? {});
        throw new Error(datos.error || "No se pudieron guardar los enlaces.");
      }
      setRedes(obtenerRedesSociales(datos.identidad.redes_sociales));
      setMensaje("Enlaces de contacto guardados.");
    } catch (error) {
      setErrorGeneral(error instanceof Error ? error.message : "No se pudieron guardar los enlaces.");
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
          <h3>Redes y sitio web</h3>
          <p>Pega el enlace completo que comienza con https://. Todos son opcionales.</p>
        </header>
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

      <div aria-live="polite" className={styles.mensajes}>
        {mensaje ? <p className={styles.exito}>{mensaje}</p> : null}
        {errorGeneral ? <p className={styles.error}>{errorGeneral}</p> : null}
      </div>
    </section>
  );
}
