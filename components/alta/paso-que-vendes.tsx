"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { DEFINICIONES_RUBROS } from "../../lib/negocios/rubros";
import { Boton, Selector, useAvisos } from "../ui";
import styles from "./paso.module.css";

/* Paso 2 del alta: a qué se dedica el negocio.
 *
 * El aviso de que el rubro se elige una sola vez va **a la vista y en el momento
 * de decidir**, no escondido en un enlace de ayuda. Es la decisión más cara de
 * deshacer de todo el sistema: cambiarla reinicia el catálogo.
 *
 * Al elegir, el sistema siembra sus categorías, sus íconos y sus campos, así que
 * el dueño no arranca de una pantalla en blanco. Por eso el rubro es el segundo
 * paso y no el último: todo lo que viene después depende de él.
 */
export function PasoQueVendes({ rubroInicial }: { rubroInicial: string }) {
  const router = useRouter();
  const { mostrarAviso } = useAvisos();
  const [rubro, setRubro] = useState(rubroInicial);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/alta/paso", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paso: 2, rubro }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        errores?: Record<string, string>;
        ruta?: string;
      };
      if (!respuesta.ok || !datos.ruta) {
        setError(datos.errores?.rubro ?? "");
        throw new Error(datos.error || "No se pudo guardar.");
      }
      router.push(datos.ruta);
    } catch (causa) {
      mostrarAviso({
        titulo: "No se pudo guardar",
        mensaje: causa instanceof Error ? causa.message : "Intentá de nuevo.",
        variante: "error",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className={styles.paso} onSubmit={guardar}>
      <div className={styles.titulo}>
        <h2>¿Qué vendés?</h2>
        <p>Con esto preparamos tus categorías y los datos de cada producto.</p>
      </div>

      <Selector
        error={error}
        etiqueta="A qué se dedica tu negocio"
        id="rubro-alta"
        onChange={(evento) => setRubro(evento.target.value)}
        required
        value={rubro}
      >
        <option value="">Elegí uno</option>
        {DEFINICIONES_RUBROS.map(({ id, nombre, ejemplo }) => (
          <option key={id} value={id}>
            {nombre} — {ejemplo}
          </option>
        ))}
      </Selector>

      {/* Breve, corto y puntual, como lo pide el plan. Y a la vista, no en un
          enlace: quien tiene que leerlo es justamente el que no va a hacer clic
          en «más información». */}
      <div className={styles.advertencia} role="note">
        <p className={styles.advertenciaTitulo}>
          <span aria-hidden="true">⚠</span> El rubro se elige una sola vez.
        </p>
        <p>
          Para cambiarlo después hay que pedírnoslo, y el catálogo se reinicia: se borran
          categorías, productos y fotos. Te vas a poder descargar todo en Excel antes.
        </p>
      </div>

      <Boton cargando={guardando} disabled={rubro === ""} type="submit">
        Elegir este rubro y seguir
      </Boton>
    </form>
  );
}
