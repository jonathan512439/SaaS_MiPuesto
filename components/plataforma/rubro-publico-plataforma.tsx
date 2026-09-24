"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  RUBROS_PUBLICOS,
  nombreDeRubroPublico,
} from "../../lib/negocios/rubros-publicos";
import { Boton, useAvisos } from "../ui";
import styles from "./cambio-de-rubro.module.css";

/* Cambiar el rubro público de un negocio: la etiqueta con la que lo encuentra
 * el cliente —«Pollería», «Juguetería»—. Fase 11.
 *
 * El dueño no puede: lo elige una vez al crear su catálogo y, si quiere
 * cambiarlo, nos escribe. Esto es lo que usa la plataforma cuando escribe.
 *
 * **No toca el catálogo**, a diferencia de «Cambiar de rubro», que reinicia.
 * Por eso solo ofrece los rubros del mismo tipo de catálogo que el negocio ya
 * tiene: pasar de «Pollería» a «Salteñería» es una etiqueta; pasar a
 * «Juguetería» es otra siembra, y para eso está el otro botón.
 */
export function RubroPublicoPlataforma({
  negocioId,
  siembra,
  rubroPublicoActual,
}: {
  negocioId: string;
  siembra: string | null;
  rubroPublicoActual: string | null;
}) {
  const router = useRouter();
  const { mostrarAviso } = useAvisos();
  const [abierto, setAbierto] = useState(false);
  const [elegido, setElegido] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const opciones = RUBROS_PUBLICOS.filter((rubro) => !siembra || rubro.siembra === siembra);

  async function cambiar() {
    if (elegido === "" || elegido === rubroPublicoActual) return;
    setOcupado(true);
    try {
      const respuesta = await fetch("/api/plataforma/negocios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ negocio_id: negocioId, accion: "rubro_publico", rubro_publico: elegido }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo cambiar el rubro.");
      mostrarAviso({ titulo: `Ahora es ${nombreDeRubroPublico(elegido)}`, variante: "exito" });
      setAbierto(false);
      setElegido("");
      router.refresh();
    } catch (motivo) {
      mostrarAviso({
        titulo: "No se cambió el rubro",
        mensaje: motivo instanceof Error ? motivo.message : "Intenta de nuevo.",
        variante: "error",
      });
    } finally {
      setOcupado(false);
    }
  }

  if (!abierto) {
    return (
      <button className={styles.abrir} onClick={() => setAbierto(true)} type="button">
        Rubro público: {nombreDeRubroPublico(rubroPublicoActual) ?? "sin elegir"}
      </button>
    );
  }

  return (
    <div className={styles.cajaNeutra}>
      <p>
        Hoy es <strong>{nombreDeRubroPublico(rubroPublicoActual) ?? "ninguno"}</strong>. Cambiarlo
        no toca su catálogo: es cómo lo encuentran en el buscador.
      </p>
      <label className={styles.campo}>
        <span>Rubro público nuevo</span>
        <select onChange={(evento) => setElegido(evento.target.value)} value={elegido}>
          <option value="">Elige uno</option>
          {opciones.map(({ id, nombre }) => (
            <option disabled={id === rubroPublicoActual} key={id} value={id}>
              {nombre}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.acciones}>
        <Boton
          cargando={ocupado}
          disabled={elegido === "" || elegido === rubroPublicoActual}
          onClick={() => void cambiar()}
          type="button"
        >
          Cambiar el rubro público
        </Boton>
        <Boton onClick={() => setAbierto(false)} type="button" variante="secundario">
          Dejarlo como está
        </Boton>
      </div>
    </div>
  );
}
