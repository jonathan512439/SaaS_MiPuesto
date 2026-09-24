"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { proponerSlug, validarSlug } from "../../lib/negocios/validacion";
import { Boton, Campo, useAvisos } from "../ui";
import styles from "./paso.module.css";

type Disponibilidad = "sin-consultar" | "consultando" | "libre" | "tomada" | "invalida";

/* Paso 1 del alta: quién eres y cómo se llama tu negocio.
 *
 * El slug **se calcula mientras escribe** y se confirma acá, no después. Es la
 * dirección que va a repartir en tarjetas y códigos QR: descubrir en el paso 4
 * que estaba tomada obligaría a rehacer lo impreso.
 *
 * Se deja editar aparte del nombre porque las dos cosas no siempre coinciden:
 * «Ferretería El Sol S.R.L.» quiere ser `ferreteria-el-sol`, no
 * `ferreteria-el-sol-s-r-l`.
 */
export function PasoQuienSos({
  nombreAdminInicial,
  nombreInicial,
  slugInicial,
}: {
  nombreAdminInicial: string;
  nombreInicial: string;
  slugInicial: string;
}) {
  const router = useRouter();
  const { mostrarAviso } = useAvisos();
  const [nombreAdmin, setNombreAdmin] = useState(nombreAdminInicial);
  const [nombre, setNombre] = useState(nombreInicial);
  const [slug, setSlug] = useState(slugInicial);
  /* Mientras no lo toque, el slug sigue al nombre. En cuanto lo edita a mano,
     deja de seguirlo: si no, escribir una letra más en el nombre le borraría la
     dirección que acaba de elegir. */
  const [slugAMano, setSlugAMano] = useState(slugInicial !== "");
  /* La respuesta del servidor **con la dirección que contestó**. Guardar solo
     «libre» o «tomada» dejaba en pantalla el veredicto de un nombre que ya no está
     escrito: se escribe letra por letra, y la respuesta de «ferre» puede llegar
     después que la de «ferreteria». Con la dirección al lado, una respuesta vieja
     simplemente no coincide y se ignora sola. */
  const [respuesta, setRespuesta] = useState<{ slug: string; libre: boolean } | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const slugMostrado = slugAMano ? slug : proponerSlug(nombre);
  const formatoInvalido = validarSlug(slugMostrado) !== "";
  /* Preguntar por la propia dirección devolvería «ocupada»: la ocupa este mismo
     negocio. Se da por buena sin consultar. */
  const esLaPropia = slugMostrado !== "" && slugMostrado === slugInicial;
  const hayQueConsultar = !esLaPropia && !formatoInvalido && slugMostrado !== "";

  /* El veredicto **se deduce al dibujar**, no se guarda en estado. Guardarlo
     obligaba a escribirlo desde el efecto en cada rama —vacío, inválido,
     consultando—, y eso encadena dibujados de más. Acá el estado guarda una sola
     cosa: qué contestó el servidor y sobre qué dirección. */
  const disponibilidad: Disponibilidad = esLaPropia
    ? "libre"
    : slugMostrado === ""
      ? "sin-consultar"
      : formatoInvalido
        ? "invalida"
        : respuesta?.slug === slugMostrado
          ? respuesta.libre
            ? "libre"
            : "tomada"
          : "consultando";

  useEffect(() => {
    if (!hayQueConsultar) return;

    /* Con retardo: sin él se consultaría una vez por tecla. */
    const temporizador = setTimeout(() => {
      void (async () => {
        try {
          const contestacion = await fetch(
            `/api/negocios/disponibilidad-slug?slug=${encodeURIComponent(slugMostrado)}`,
          );
          const datos = (await contestacion.json()) as { disponible?: boolean };
          setRespuesta({ slug: slugMostrado, libre: datos.disponible === true });
        } catch {
          /* Sin respuesta se queda en «verificando» y el botón sigue trabado, que
             es lo correcto: dejarlo pasar podría quedarse con una dirección
             ocupada y fallar recién al guardar. */
        }
      })();
    }, 400);

    return () => clearTimeout(temporizador);
  }, [hayQueConsultar, slugMostrado]);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setErrores({});
    try {
      const respuesta = await fetch("/api/alta/paso", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paso: 1, nombre_admin: nombreAdmin, nombre, slug: slugMostrado }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        errores?: Record<string, string>;
        ruta?: string;
      };
      if (!respuesta.ok || !datos.ruta) {
        setErrores(datos.errores ?? {});
        throw new Error(datos.error || "No se pudo guardar.");
      }
      router.push(datos.ruta);
    } catch (causa) {
      mostrarAviso({
        titulo: "No se pudo guardar",
        mensaje: causa instanceof Error ? causa.message : "Intenta de nuevo.",
        variante: "error",
      });
    } finally {
      setGuardando(false);
    }
  }

  const puedeSeguir =
    nombreAdmin.trim().length >= 2 && nombre.trim().length >= 2 && disponibilidad === "libre";

  return (
    <form className={styles.paso} onSubmit={guardar}>
      <div className={styles.titulo}>
        <h2>¿Cómo te llamas?</h2>
        <p>Para saludarte por tu nombre y no por «usuario».</p>
      </div>

      <Campo
        autoComplete="given-name"
        error={errores.nombre_admin}
        etiqueta="Tu nombre"
        id="nombre-admin"
        maxLength={60}
        onChange={(evento) => setNombreAdmin(evento.target.value)}
        placeholder="Jonathan"
        required
        value={nombreAdmin}
      />

      <Campo
        autoComplete="organization"
        error={errores.nombre}
        etiqueta="¿Cómo se llama tu negocio?"
        id="nombre-negocio"
        maxLength={80}
        onChange={(evento) => setNombre(evento.target.value)}
        placeholder="Ferretería El Sol"
        required
        value={nombre}
      />

      <Campo
        ayuda="Solo minúsculas, números y guiones. Cambiarla después deja muertos los códigos QR que ya hayas impreso."
        error={errores.slug}
        etiqueta="La dirección de tu catálogo"
        id="slug-negocio"
        maxLength={48}
        onChange={(evento) => {
          setSlugAMano(true);
          setSlug(evento.target.value.toLowerCase());
        }}
        value={slugMostrado}
      />

      <p className={styles.direccion} data-estado={disponibilidad} aria-live="polite">
        <span className={styles.dominio}>mipuesto.com/</span>
        <strong>{slugMostrado || "tu-negocio"}</strong>
        <span className={styles.veredicto}>
          {disponibilidad === "libre" ? "✓ disponible" : null}
          {disponibilidad === "tomada" ? "✕ ya está tomada" : null}
          {disponibilidad === "consultando" ? "verificando…" : null}
          {disponibilidad === "invalida" ? "✕ no se puede usar" : null}
        </span>
      </p>

      <Boton cargando={guardando} disabled={!puedeSeguir} type="submit">
        Seguir
      </Boton>
    </form>
  );
}
