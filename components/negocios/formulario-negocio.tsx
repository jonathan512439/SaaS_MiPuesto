"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import {
  proponerSlug,
  type TipoNegocio,
  validarDatosNegocio,
  validarSlug,
} from "../../lib/negocios/validacion";
import { AreaTexto, Boton, Campo, Selector } from "../ui";
import styles from "../../app/(admin)/dashboard/configuracion/configuracion.module.css";

export type PerfilNegocioInicial = {
  nombre: string;
  slug: string;
  descripcion: string | null;
  tipo_negocio: string;
  telefono_whatsapp: string;
};

type PropiedadesFormularioNegocio = {
  negocioInicial: PerfilNegocioInicial | null;
};

type EstadoSlug = "inicial" | "revisando" | "disponible" | "ocupado";

type RespuestaGuardado = {
  error?: string;
  errores?: Record<string, string>;
  negocio?: PerfilNegocioInicial;
};

const ETIQUETAS_MODALIDAD: Record<TipoNegocio, string> = {
  catalogo_estatico: "Catálogo para mostrar",
  catalogo_cta: "Pedidos o reservas por producto",
  tienda_virtual: "Tienda con carrito",
};

export function FormularioNegocio({ negocioInicial }: PropiedadesFormularioNegocio) {
  const [nombre, setNombre] = useState(negocioInicial?.nombre ?? "");
  const [slug, setSlug] = useState(negocioInicial?.slug ?? "");
  const [descripcion, setDescripcion] = useState(negocioInicial?.descripcion ?? "");
  const [tipo, setTipo] = useState<TipoNegocio>(
    (negocioInicial?.tipo_negocio as TipoNegocio | undefined) ?? "catalogo_estatico",
  );
  const [telefono, setTelefono] = useState(negocioInicial?.telefono_whatsapp ?? "");
  const [estadoSlug, setEstadoSlug] = useState<EstadoSlug>("inicial");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const slugEditado = useRef(Boolean(negocioInicial?.slug));
  const errorFormatoSlug = validarSlug(slug);
  const estadoSlugVisible = errorFormatoSlug
    ? slug
      ? "invalido"
      : "inicial"
    : estadoSlug;

  useEffect(() => {
    const errorFormato = validarSlug(slug);
    if (errorFormato) return;

    const controlador = new AbortController();
    const temporizador = window.setTimeout(async () => {
      setEstadoSlug("revisando");
      try {
        const respuesta = await fetch(
          `/api/negocios/disponibilidad-slug?slug=${encodeURIComponent(slug)}`,
          { cache: "no-store", signal: controlador.signal },
        );
        const datos = (await respuesta.json()) as { disponible?: boolean };
        setEstadoSlug(datos.disponible ? "disponible" : "ocupado");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setEstadoSlug("inicial");
      }
    }, 400);

    return () => {
      window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, [slug]);

  function cambiarNombre(valor: string) {
    setNombre(valor);
    if (!slugEditado.current) {
      setSlug(proponerSlug(valor));
      setEstadoSlug("inicial");
    }
  }

  function cambiarSlug(valor: string) {
    slugEditado.current = true;
    setSlug(valor.trim().toLowerCase());
    setEstadoSlug("inicial");
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje("");

    const entrada = {
      nombre,
      slug,
      descripcion,
      tipo_negocio: tipo,
      telefono_whatsapp: telefono,
    };
    const validacion = validarDatosNegocio(entrada);

    if (!validacion.correcto) {
      setErrores(validacion.errores);
      return;
    }

    if (estadoSlugVisible === "ocupado" || estadoSlugVisible === "invalido") {
      setErrores({ slug: "Elegí una dirección disponible antes de guardar." });
      return;
    }

    setErrores({});
    setGuardando(true);

    const respuesta = await fetch("/api/negocios/perfil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validacion.datos),
    });
    const datos = (await respuesta.json()) as RespuestaGuardado;

    if (!respuesta.ok) {
      setErrores(datos.errores ?? {});
      setMensaje(datos.error ?? "No se pudo guardar el negocio.");
      setGuardando(false);
      return;
    }

    if (datos.negocio) {
      setNombre(datos.negocio.nombre);
      setSlug(datos.negocio.slug);
      setDescripcion(datos.negocio.descripcion ?? "");
      setTipo(datos.negocio.tipo_negocio as TipoNegocio);
      setTelefono(datos.negocio.telefono_whatsapp);
    }

    setMensaje(negocioInicial ? "Cambios guardados." : "Negocio creado correctamente.");
    setGuardando(false);
  }

  const mensajeSlug = {
    inicial: "La dirección se comprobará mientras escribís.",
    revisando: "Comprobando disponibilidad…",
    disponible: "Disponible para tu catálogo.",
    ocupado: "Ese nombre ya está en uso.",
    invalido: validarSlug(slug),
  }[estadoSlugVisible];

  return (
    <form className={styles.formulario} onSubmit={guardar}>
      <section className={styles.bloqueFormulario} aria-labelledby="datos-principales">
        <div className={styles.tituloBloque}>
          <span aria-hidden="true">1</span>
          <div>
            <h2 id="datos-principales">Datos principales</h2>
            <p>Así reconocerán tu negocio quienes abran el catálogo.</p>
          </div>
        </div>
        <Campo
          autoComplete="organization"
          error={errores.nombre}
          etiqueta="Nombre del negocio"
          id="nombre"
          maxLength={80}
          onChange={(evento) => cambiarNombre(evento.target.value)}
          required
          value={nombre}
        />
        <AreaTexto
          ayuda={`${descripcion.length}/500 caracteres`}
          error={errores.descripcion}
          etiqueta="Descripción"
          id="descripcion"
          maxLength={500}
          onChange={(evento) => setDescripcion(evento.target.value)}
          placeholder="Contá brevemente qué ofrecés y qué hace especial a tu negocio."
          rows={4}
          value={descripcion}
        />
      </section>

      <section className={styles.bloqueFormulario} aria-labelledby="direccion-catalogo">
        <div className={styles.tituloBloque}>
          <span aria-hidden="true">2</span>
          <div>
            <h2 id="direccion-catalogo">Dirección del catálogo</h2>
            <p>Será el nombre corto que compartirás con tus clientes.</p>
          </div>
        </div>
        <Campo
          autoCapitalize="none"
          autoCorrect="off"
          error={errores.slug}
          etiqueta="Nombre corto"
          id="slug"
          maxLength={48}
          minLength={3}
          onChange={(evento) => cambiarSlug(evento.target.value)}
          required
          spellCheck={false}
          value={slug}
        />
        <p
          className={
            estadoSlugVisible === "disponible"
              ? styles.slugDisponible
              : estadoSlugVisible === "ocupado" || estadoSlugVisible === "invalido"
                ? styles.slugNoDisponible
                : styles.ayudaSlug
          }
          role="status"
        >
          <span aria-hidden="true">
            {estadoSlugVisible === "disponible"
              ? "✓"
              : estadoSlugVisible === "ocupado" || estadoSlugVisible === "invalido"
                ? "!"
                : "i"}
          </span>{" "}
          {mensajeSlug}
        </p>
        <p className={styles.vistaDireccion}>
          mipuesto.com/<strong>{slug || "tu-negocio"}</strong>
        </p>
      </section>

      <section className={styles.bloqueFormulario} aria-labelledby="atencion-negocio">
        <div className={styles.tituloBloque}>
          <span aria-hidden="true">3</span>
          <div>
            <h2 id="atencion-negocio">Atención y modalidad</h2>
            <p>Elegí cómo usarás el catálogo y dónde recibirás consultas.</p>
          </div>
        </div>
        <Selector
          error={errores.tipo_negocio}
          etiqueta="Modalidad"
          id="tipo-negocio"
          onChange={(evento) => setTipo(evento.target.value as TipoNegocio)}
          required
          value={tipo}
        >
          {Object.entries(ETIQUETAS_MODALIDAD).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </Selector>
        <Campo
          autoComplete="tel"
          ayuda="Podés escribir 71234567 o +591 71234567."
          error={errores.telefono_whatsapp}
          etiqueta="WhatsApp del negocio"
          id="telefono-whatsapp"
          inputMode="tel"
          onChange={(evento) => setTelefono(evento.target.value)}
          placeholder="71234567"
          required
          type="tel"
          value={telefono}
        />
      </section>

      {mensaje ? (
        <p
          className={Object.keys(errores).length ? styles.mensajeError : styles.mensajeExito}
          role={Object.keys(errores).length ? "alert" : "status"}
        >
          {mensaje}
        </p>
      ) : null}

      <div className={styles.accionesFormulario}>
        <Boton cargando={guardando} type="submit">
          {negocioInicial ? "Guardar cambios" : "Crear mi negocio"}
        </Boton>
        <p>Los cambios quedan protegidos por tu sesión y las políticas RLS.</p>
      </div>
    </form>
  );
}
