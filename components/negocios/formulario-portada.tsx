"use client";

import { useEffect, useState, type FormEvent } from "react";

import type { ContextoDestino } from "../../lib/negocios/destino-banner";
import type { TextoSobreImagen } from "../../lib/negocios/texto-sobre-imagen";
import { PasoNumerado } from "../dashboard/paso-numerado";
import { Boton, Formulario, useAvisos } from "../ui";
import {
  CamposDelCartel,
  textoEnEdicion,
  textoGuardable,
  type TextoEnEdicion,
} from "./campos-del-cartel";
import styles from "./cartel.module.css";

/* El texto que va encima de la portada, en Apariencia.
 *
 * La portada es la foto grande del principio del catálogo; acá se decide si
 * lleva algo escrito y un botón. Hasta el 2026-10-13 compartía formulario con el
 * banner de publicidad, y el dueño no sabía qué era cada cosa: el banner se fue
 * a Promociones, que es lo que es. Desde el 2026-10-21 la foto se elige en
 * Apariencia, justo arriba de este formulario, y no en «Mi negocio».
 */
export function FormularioPortada({
  portadaInicial,
  tienePortada,
  destinos,
  alCambiar,
}: {
  portadaInicial: TextoSobreImagen;
  /* Sin foto de portada el texto se guarda igual pero no se ve en ninguna
     parte, y hay que decírselo en vez de dejarlo escribiendo para nada. */
  tienePortada: boolean;
  destinos: ContextoDestino;
  /* Para que la vista previa de Apariencia lo dibuje mientras se escribe. */
  alCambiar?: (portada: TextoSobreImagen) => void;
}) {
  const [portada, setPortada] = useState<TextoEnEdicion>(() => textoEnEdicion(portadaInicial, destinos));
  const [error, setError] = useState<string | undefined>();
  const [guardando, setGuardando] = useState(false);
  const { mostrarAviso } = useAvisos();

  useEffect(() => {
    alCambiar?.(textoGuardable(portada, destinos));
  }, [alCambiar, destinos, portada]);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setError(undefined);
    try {
      const respuesta = await fetch("/api/negocios/banners", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ portada: textoGuardable(portada, destinos) }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        errores?: Record<string, string>;
      };
      if (!respuesta.ok) {
        setError(datos.errores?.["portada.enlace"] ?? datos.errores?.enlace);
        throw new Error(datos.error || "No se pudo guardar.");
      }
      mostrarAviso({ titulo: "Texto de la portada guardado", variante: "exito" });
    } catch (falla) {
      mostrarAviso({
        titulo: "No se pudo guardar",
        mensaje: falla instanceof Error ? falla.message : "Intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Formulario className={styles.seccion} onSubmit={guardar}>
      <header className={styles.cabecera}>
        <PasoNumerado numero={5} titulo="Texto sobre tu portada" />
        {/* Una frase, y el aviso solo cuando falta la foto. Hasta el
            2026-10-22 eran dos párrafos que volvían a explicar qué es la
            portada y dónde se cambia, justo debajo de donde se cambia. */}
        <p>
          Opcional: un saludo o lo que vendes, con un botón. Sin texto, la foto se ve sola.
          {tienePortada ? null : (
            <>
              {" "}
              <strong>Todavía no subiste una foto de portada:</strong> súbela justo arriba.
            </>
          )}
        </p>
      </header>

      <fieldset className={styles.banner} disabled={guardando}>
        <legend>Lo que se lee sobre la portada</legend>
        <CamposDelCartel
          cambiar={(cambio) => {
            setPortada((actual) => ({ ...actual, ...cambio }));
            setError(undefined);
          }}
          destinos={destinos}
          error={error}
          prefijo="portada"
          texto={portada}
        />
      </fieldset>

      <Boton cargando={guardando} type="submit">
        Guardar el texto de la portada
      </Boton>
    </Formulario>
  );
}
