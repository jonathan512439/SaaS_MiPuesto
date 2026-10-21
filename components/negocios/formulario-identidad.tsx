"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { obtenerRedesSociales, type RedesSocialesNegocio } from "../../lib/negocios/identidad";
import { RUTAS_PANEL } from "../../lib/panel/rutas";
import { Boton, Formulario, useAvisos } from "../ui";
import { ImagenesDelNegocio } from "./imagenes-del-negocio";
import styles from "./formulario-identidad.module.css";

/* El QR de cobro y el contacto del negocio, en «Mi negocio».
 *
 * Hasta el 2026-10-21 acá estaban también el logo y la portada. Se mudaron a
 * Apariencia, donde está la vista previa del catálogo: son lo que más cambia
 * cómo se ve, y elegirlos sin verlos obligaba a abrir el catálogo en otra
 * pestaña. Lo que queda acá es para que el cliente pague y encuentre al negocio.
 */
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

export function FormularioIdentidad({
  identidadInicial,
  negocioNombre,
  urlSupabase,
}: Propiedades) {
  const [ubicacion, setUbicacion] = useState(identidadInicial.ubicacion_url ?? "");
  const [resenas, setResenas] = useState(identidadInicial.resenas_url ?? "");
  const [redes, setRedes] = useState<RedesSocialesNegocio>(() =>
    obtenerRedesSociales(identidadInicial.redes_sociales),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const { mostrarAviso } = useAvisos();
  const [ocupado, setOcupado] = useState<"redes" | "">("");

  function actualizarRed(campo: keyof RedesSocialesNegocio, valor: string) {
    setRedes((actuales) => ({ ...actuales, [campo]: valor }));
    setErrores((actuales) => ({ ...actuales, [campo]: "" }));
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
          <p>Cobro y contacto</p>
          <h2 id="identidad-negocio">Cómo te pagan y cómo te encuentran</h2>
        </div>
        <p>
          El logo y la foto de portada se eligen en{" "}
          <Link href={RUTAS_PANEL.apariencia}>Apariencia</Link>, al lado de la vista previa de tu
          catálogo.
        </p>
      </header>

      <ImagenesDelNegocio
        negocioNombre={negocioNombre}
        rutasIniciales={{ qr: identidadInicial.qr_pago_url }}
        tipos={["qr"]}
        urlSupabase={urlSupabase}
      />

      <Formulario className={styles.redes} onSubmit={guardarRedes}>
        <header>
          <h3>Contacto y ubicación</h3>
          <p>Abre cada página —tu Facebook, tu Instagram—, copia su dirección y pégala acá. Todos son opcionales.</p>
        </header>

        {/* Los dos enlaces lado a lado en una pantalla ancha: uno debajo del
            otro ocupaban media pantalla cada uno y dejaban la otra mitad
            vacía. */}
        <div className={styles.enlacesContacto}>
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
            Abre Google Maps, busca tu negocio, toca «Compartir» y pega acá el enlace. Tus
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
              <strong>Desde una computadora</strong>, abre Google Maps y busca tu
              negocio.
            </li>
            <li>Haz clic en tu ficha y baja hasta «Reseñas».</li>
            <li>Haz clic en «Escribir una reseña».</li>
            <li>Copia la dirección que se abre y pégala acá.</li>
          </ol>
          <small className={styles.ayudaUbicacion}>
            No sirve el enlace de «Compartir»: ese lleva a ver tu ficha, no a
            calificarla.
          </small>
          {errores.resenas_url ? <small>{errores.resenas_url}</small> : null}
        </label>
        </div>
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
      </Formulario>

    </section>
  );
}
