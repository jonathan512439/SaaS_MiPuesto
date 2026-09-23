"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import {
  proponerSlug,
  type TipoNegocio,
  validarDatosNegocio,
  validarSlug,
} from "../../lib/negocios/validacion";
import { nombreDeRubro, rubroOfrece } from "../../lib/negocios/rubros";
import { AreaTexto, Boton, Campo, Selector, useAvisos } from "../ui";
import styles from "../../app/(admin)/dashboard/negocio/negocio.module.css";
import { PasoNumerado } from "../dashboard/paso-numerado";

export type PerfilNegocioInicial = {
  nombre: string;
  slug: string;
  descripcion: string | null;
  subnombre: string | null;
  tipo_negocio: string;
  rubro?: string | null;
  rubro_bloqueado_en?: string | null;
  pide_numero_mesa?: boolean | null;
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
  catalogo_cta: "Pedidos o reservas por WhatsApp",
  tienda_virtual: "Tienda con carrito",
};

const EXPLICACIONES_MODALIDAD: Record<TipoNegocio, { titulo: string; descripcion: string }> = {
  catalogo_estatico: {
    titulo: "Para mostrar lo que ofreces",
    descripcion:
      "Es una buena opción para menús, vitrinas y listas de servicios. Tus clientes verán la información y se comunicarán contigo por WhatsApp.",
  },
  catalogo_cta: {
    titulo: "Para recibir pedidos o reservas por WhatsApp",
    descripcion:
      "Cada producto o servicio tendrá una acción para pedir o reservar. Es útil cuando confirmas los detalles directamente por WhatsApp.",
  },
  tienda_virtual: {
    titulo: "Para reunir varios productos antes de pedir",
    descripcion:
      "Tus clientes podrán preparar un carrito y enviarte el pedido por WhatsApp. Es ideal para tiendas con varias opciones o inventario.",
  },
};

export function FormularioNegocio({ negocioInicial }: PropiedadesFormularioNegocio) {
  const [nombre, setNombre] = useState(negocioInicial?.nombre ?? "");
  const [slug, setSlug] = useState(negocioInicial?.slug ?? "");
  const [descripcion, setDescripcion] = useState(negocioInicial?.descripcion ?? "");
  const [subnombre, setSubnombre] = useState(negocioInicial?.subnombre ?? "");
  const [tipo, setTipo] = useState<TipoNegocio>(
    (negocioInicial?.tipo_negocio as TipoNegocio | undefined) ?? "catalogo_estatico",
  );
  const [telefono, setTelefono] = useState(negocioInicial?.telefono_whatsapp ?? "");
  const [rubro, setRubro] = useState(negocioInicial?.rubro ?? "");
  const [pideMesa, setPideMesa] = useState(negocioInicial?.pide_numero_mesa === true);
  const [estadoSlug, setEstadoSlug] = useState<EstadoSlug>("inicial");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const { mostrarAviso } = useAvisos();
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

    const entrada = {
      nombre,
      slug,
      descripcion,
      subnombre,
      tipo_negocio: tipo,
      telefono_whatsapp: telefono,
      rubro,
      pide_numero_mesa: pideMesa,
    };
    const validacion = validarDatosNegocio(entrada);

    if (!validacion.correcto) {
      setErrores(validacion.errores);
      return;
    }

    if (estadoSlugVisible === "ocupado" || estadoSlugVisible === "invalido") {
      setErrores({ slug: "Elige una dirección disponible antes de guardar." });
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
      mostrarAviso({
        titulo: "No se pudo guardar el negocio",
        mensaje: datos.error,
        variante: "error",
      });
      setGuardando(false);
      return;
    }

    if (datos.negocio) {
      setNombre(datos.negocio.nombre);
      setSlug(datos.negocio.slug);
      setDescripcion(datos.negocio.descripcion ?? "");
      setSubnombre(datos.negocio.subnombre ?? "");
      setTipo(datos.negocio.tipo_negocio as TipoNegocio);
      setRubro(datos.negocio.rubro ?? "");
      setPideMesa(datos.negocio.pide_numero_mesa === true);
      setTelefono(datos.negocio.telefono_whatsapp);
    }

    mostrarAviso({
      titulo: negocioInicial ? "Cambios guardados" : "Negocio creado",
      mensaje: negocioInicial ? undefined : "Tu dirección quedó reservada.",
      variante: "exito",
    });
    setGuardando(false);
  }

  const mensajeSlug = {
    inicial: "La dirección se comprobará mientras escribes.",
    revisando: "Comprobando disponibilidad…",
    disponible: "Disponible para tu catálogo.",
    ocupado: "Ese nombre ya está en uso.",
    invalido: validarSlug(slug),
  }[estadoSlugVisible];

  return (
    <form className={styles.formulario} onSubmit={guardar}>
      <section className={styles.bloqueFormulario} aria-labelledby="datos-principales">
        <PasoNumerado
          descripcion="Así reconocerán tu negocio quienes abran el catálogo."
          idTitulo="datos-principales"
          numero={1}
          titulo="Datos principales"
        />
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
        {/* El renglón corto bajo el nombre, en la cabecera del catálogo. Es
            distinto de la descripción: la descripción es el párrafo del negocio
            y este es el rótulo que se lee de un vistazo al lado del logo. */}
        <Campo
          ayuda="Aparece bajo el nombre, en la cabecera del catálogo."
          error={errores.subnombre}
          etiqueta="Renglón bajo el nombre (opcional)"
          id="subnombre"
          maxLength={60}
          onChange={(evento) => setSubnombre(evento.target.value)}
          placeholder="Pollos a la brasa · Desde 1998"
          value={subnombre}
        />
        {/* Solo texto: el rubro se elige una sola vez, al crear el catálogo, y
            ofrecerlo acá como campo editable —aunque fuera de solo lectura— sigue
            sugiriendo que es una decisión de esta pantalla. Acá se informa, no se
            configura.

            El caso sin rubro no es hipotético: existen negocios anteriores al
            alta. Si no dijera nada, la lista de «lo que falta» los manda a esta
            pantalla y no encuentran cómo resolverlo. */}
        <p className={styles.rubroInformado}>
          {rubro ? (
            <>
              Tu negocio está registrado como <strong>{nombreDeRubro(rubro)}</strong>. Se elige
              una sola vez, al crear el catálogo, porque de él salen tus categorías y los
              datos de cada producto.
            </>
          ) : (
            <>
              Tu negocio todavía no tiene un rubro elegido. Escribinos y lo configuramos:
              de él salen tus categorías y los datos de cada producto.
            </>
          )}
        </p>
        <AreaTexto
          ayuda={`${descripcion.length}/500 caracteres`}
          error={errores.descripcion}
          etiqueta="Descripción"
          id="descripcion"
          maxLength={500}
          onChange={(evento) => setDescripcion(evento.target.value)}
          placeholder="Describe brevemente lo que ofreces y qué hace especial a tu negocio."
          rows={4}
          value={descripcion}
        />
      </section>

      <section className={styles.bloqueFormulario} aria-labelledby="direccion-catalogo">
        <PasoNumerado
          descripcion="Será el nombre corto que usarás para compartir tu catálogo."
          idTitulo="direccion-catalogo"
          numero={2}
          titulo="Dirección del catálogo"
        />
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
          Dirección reservada: mipuesto.com/<strong>{slug || "tu-negocio"}</strong>
        </p>
      </section>

      <section className={styles.bloqueFormulario} aria-labelledby="atencion-negocio">
        <PasoNumerado
          descripcion="Elige cómo usarás el catálogo y dónde recibirás consultas."
          idTitulo="atencion-negocio"
          numero={3}
          titulo="Atención y modalidad"
        />
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
        {/* Pegada al selector que explica, y no tres campos más abajo. Una
            explicación que cambia al elegir tiene que estar donde se elige: si
            queda lejos, el dueño cambia la modalidad y no ve que algo respondió. */}
        <div className={styles.modalidadExplicacion} aria-live="polite">
          <h3>{EXPLICACIONES_MODALIDAD[tipo].titulo}</h3>
          <p>{EXPLICACIONES_MODALIDAD[tipo].descripcion}</p>
          <p>Puedes cambiar esta modalidad más adelante si tu negocio lo necesita.</p>
        </div>
        {/* Aparece pegado al rubro porque solo tiene sentido ahí: pedirle la
            mesa a quien compra ropa por WhatsApp es un campo más entre él y el
            pedido. Si el rubro cambia y deja de ofrecerlo, la marca guardada no
            se borra —el rubro oculta interfaz, nunca datos—, pero el catálogo
            deja de preguntar. */}
        {rubroOfrece(rubro, "numero_de_mesa") ? (
          <label className={styles.interruptor}>
            <input
              checked={pideMesa}
              onChange={(evento) => setPideMesa(evento.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>Pedir el número de mesa</strong>
              <small>
                Al confirmar, tu cliente escribe en qué mesa está y lo ves en el pedido
                y en el mensaje de WhatsApp.
              </small>
            </span>
          </label>
        ) : null}
        <Campo
          autoComplete="tel"
          ayuda="Puedes escribir 71234567 o +591 71234567."
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

      <div className={styles.accionesFormulario}>
        <Boton cargando={guardando} type="submit">
          {negocioInicial ? "Guardar cambios" : "Crear mi negocio"}
        </Boton>
        <p>Solo tú puedes ver y modificar los datos de este negocio.</p>
      </div>
    </form>
  );
}
