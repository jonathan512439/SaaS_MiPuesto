"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";

import { AYUDA_LOGO, AYUDA_PORTADA, AYUDA_QR } from "../../lib/ayudas-formularios";
import { prepararImagenParaSubir } from "../../lib/imagenes";
import type { RespuestaSubidaIdentidad, TipoImagenIdentidad } from "../../lib/negocios/identidad";
import { obtenerUrlPublicaImagenNegocio } from "../../lib/negocios/imagenes-publicas";
import { Boton, useAvisos, useConfirmacion } from "../ui";
import styles from "./formulario-identidad.module.css";

/* Las imágenes del negocio —portada, logo, QR de cobro—: subir, reemplazar y
 * quitar, cada una por su lado.
 *
 * Vivían todas en «Mi negocio». Desde el 2026-10-21 el logo y la portada se
 * eligen en Apariencia, al lado de la vista previa del catálogo, que es donde
 * se ve qué cambian; el QR de cobro se queda en «Mi negocio», con el contacto.
 * Por eso el componente recibe qué tipos mostrar en vez de mostrarlos todos.
 *
 * Cada imagen se guarda al subirla: no hay un «Guardar» aparte. Es lo que ya
 * hacía, y un archivo elegido que no se guarda hasta tocar otro botón es la
 * forma más fácil de perderlo.
 */

const DATOS_POR_TIPO: Record<TipoImagenIdentidad, { titulo: string; ayuda: string; guardada: string }> = {
  portada: { titulo: "Foto de portada", ayuda: AYUDA_PORTADA, guardada: "Portada guardada" },
  logo: { titulo: "Logo", ayuda: AYUDA_LOGO, guardada: "Logo guardado" },
  qr: { titulo: "QR de cobro", ayuda: AYUDA_QR, guardada: "QR de cobro guardado" },
};

type Imagen = { ruta: string | null; url: string | null };

export function ImagenesDelNegocio({
  tipos,
  rutasIniciales,
  urlSupabase,
  negocioNombre,
  alCambiar,
  notas,
}: {
  tipos: ReadonlyArray<TipoImagenIdentidad>;
  rutasIniciales: Partial<Record<TipoImagenIdentidad, string | null>>;
  urlSupabase: string;
  negocioNombre: string;
  /* Para que una vista previa muestre la imagen nueva apenas se guarda. */
  alCambiar?: (tipo: TipoImagenIdentidad, url: string | null) => void;
  /* Una línea más debajo de la ayuda de un tipo, para lo que depende de la
     pantalla: «el texto de encima se escribe justo abajo». */
  notas?: Partial<Record<TipoImagenIdentidad, ReactNode>>;
}) {
  const [imagenes, setImagenes] = useState<Partial<Record<TipoImagenIdentidad, Imagen>>>(() =>
    Object.fromEntries(
      tipos.map((tipo) => {
        const ruta = rutasIniciales[tipo] ?? null;
        return [tipo, { ruta, url: obtenerUrlPublicaImagenNegocio(urlSupabase, ruta) }];
      }),
    ),
  );
  const [ocupado, setOcupado] = useState<TipoImagenIdentidad | "">("");
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();

  function guardarLocal(tipo: TipoImagenIdentidad, imagen: Imagen) {
    setImagenes((actuales) => ({ ...actuales, [tipo]: imagen }));
    alCambiar?.(tipo, imagen.url);
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
      const respuesta = await fetch("/api/negocios/identidad", { method: "POST", body: formulario });
      const datos = (await respuesta.json().catch(() => ({}))) as RespuestaSubidaIdentidad;
      if (!respuesta.ok || !datos.imagen) {
        throw new Error(datos.error || "No se pudo guardar la imagen.");
      }
      guardarLocal(tipo, { ruta: datos.imagen.ruta, url: datos.imagen.url });
      mostrarAviso({
        titulo: DATOS_POR_TIPO[tipo].guardada,
        variante: "exito",
      });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo guardar la imagen",
        mensaje: error instanceof Error ? error.message : "Revisa tu conexión e intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setOcupado("");
    }
  }

  async function borrarImagen(tipo: TipoImagenIdentidad) {
    const aceptado = await confirmar({
      titulo: "Quitar esta imagen",
      descripcion: "Ya no se ve en tu catálogo público.",
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
      guardarLocal(tipo, { ruta: null, url: null });
      mostrarAviso({ titulo: "Imagen quitada", variante: "exito" });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo quitar la imagen",
        mensaje: error instanceof Error ? error.message : "Revisa tu conexión e intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setOcupado("");
    }
  }

  return (
    <div className={styles.imagenes}>
      {tipos.map((tipo) => {
        const imagen = imagenes[tipo] ?? { ruta: null, url: null };
        const { titulo, ayuda } = DATOS_POR_TIPO[tipo];
        return (
          <article className={styles.imagenFila} key={tipo}>
            <div>
              <h3>{titulo}</h3>
              <p>{ayuda}</p>
              {notas?.[tipo] ? <p>{notas[tipo]}</p> : null}
            </div>
            {imagen.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={`${titulo} de ${negocioNombre}`}
                className={tipo === "portada" ? styles.miniaturaAncha : styles.qrPrevio}
                src={imagen.url}
              />
            ) : null}
            <div className={styles.accionesImagen}>
              <label className={styles.botonArchivo}>
                {imagen.ruta ? "Reemplazar imagen" : "Elegir imagen"}
                <input
                  accept="image/jpeg,image/png,image/webp"
                  disabled={Boolean(ocupado)}
                  onChange={(evento) => void subirImagen(tipo, evento)}
                  type="file"
                />
              </label>
              {imagen.ruta ? (
                <Boton disabled={Boolean(ocupado)} onClick={() => void borrarImagen(tipo)} variante="peligro">
                  Quitar imagen
                </Boton>
              ) : null}
              {ocupado === tipo ? <span className={styles.cargando}>Preparando imagen…</span> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
