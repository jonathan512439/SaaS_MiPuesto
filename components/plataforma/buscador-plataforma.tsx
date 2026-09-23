"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { nombreDeCiudad } from "../../lib/negocios/lugares";
import { Boton, Campo, useAvisos } from "../ui";
import styles from "./zonas-plataforma.module.css";

/* El buscador del directorio, visto desde la plataforma. Fase 12.
 *
 * Arriba, lo que la gente buscó y no encontró: es la lista de tareas. Una
 * palabra que se repite es un sinónimo que falta («polera» y no «remera») o un
 * rubro que todavía no tiene negocios en esa ciudad, que es un cliente para
 * salir a buscar.
 *
 * Abajo, los sinónimos: cuando alguien busca la palabra de la izquierda, el
 * buscador suma las de la derecha.
 */

export type Sinonimo = { termino: string; equivalentes: string[] };
export type BusquedaSinResultado = {
  termino: string;
  ciudad: string;
  cantidad: number;
  ultima_vez: string;
};

export function BuscadorPlataforma({
  sinonimos,
  sinResultado,
}: {
  sinonimos: Sinonimo[];
  sinResultado: BusquedaSinResultado[];
}) {
  const router = useRouter();
  const { mostrarAviso } = useAvisos();
  const [termino, setTermino] = useState("");
  const [equivalentes, setEquivalentes] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function llamar(metodo: "POST" | "DELETE", cuerpo: Record<string, unknown>, exito: string) {
    setOcupado(true);
    try {
      const respuesta = await fetch("/api/plataforma/sinonimos", {
        method: metodo,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo guardar.");
      mostrarAviso({ titulo: exito, variante: "exito" });
      router.refresh();
      return true;
    } catch (causa) {
      mostrarAviso({
        titulo: "No se pudo guardar",
        mensaje: causa instanceof Error ? causa.message : "Intentá de nuevo.",
        variante: "error",
      });
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (await llamar("POST", { termino, equivalentes }, "Sinónimo guardado")) {
      setTermino("");
      setEquivalentes("");
    }
  }

  return (
    <section aria-labelledby="titulo-buscador" className={styles.zonas}>
      <header className={styles.cabecera}>
        <h2 id="titulo-buscador">Buscador del directorio</h2>
        <p>
          Lo que la gente buscó y no encontró, y las palabras que el buscador suma a una búsqueda.
        </p>
      </header>

      <div className={styles.pendientes}>
        <h3>Búsquedas sin resultado</h3>
        {sinResultado.length === 0 ? (
          <p className={styles.vacio}>Todavía nadie buscó algo que no estuviera.</p>
        ) : (
          <ul className={styles.lista}>
            {sinResultado.map((busqueda) => (
              <li className={styles.pendiente} key={`${busqueda.termino}-${busqueda.ciudad}`}>
                <span>
                  <strong>«{busqueda.termino}»</strong>
                  <small>
                    {busqueda.ciudad ? nombreDeCiudad(busqueda.ciudad) : "Sin ciudad"}.{" "}
                    {busqueda.cantidad === 1 ? "1 vez" : `${busqueda.cantidad} veces`}
                  </small>
                </span>
                <Boton
                  onClick={() => {
                    setTermino(busqueda.termino);
                    setEquivalentes("");
                  }}
                  type="button"
                  variante="secundario"
                >
                  Darle sinónimos
                </Boton>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form className={styles.formulario} onSubmit={guardar}>
        <h3>Sinónimo</h3>
        <p className={styles.ayuda}>
          Si ya existe la palabra, se reemplazan sus equivalentes. Las palabras se guardan sin tildes
          y en minúscula, como llegan las búsquedas.
        </p>
        <div className={styles.fila}>
          <Campo
            etiqueta="Cuando buscan"
            id="sinonimo-termino"
            maxLength={40}
            onChange={(evento) => setTermino(evento.target.value)}
            placeholder="juguetes"
            required
            value={termino}
          />
          <Campo
            ayuda="Separadas por coma."
            etiqueta="También buscar"
            id="sinonimo-equivalentes"
            onChange={(evento) => setEquivalentes(evento.target.value)}
            placeholder="muñeca, peluche, lego"
            required
            value={equivalentes}
          />
        </div>
        <div className={styles.acciones}>
          <Boton cargando={ocupado} disabled={!termino.trim() || !equivalentes.trim()} type="submit">
            Guardar sinónimo
          </Boton>
        </div>
      </form>

      <div className={styles.ciudad}>
        <h3>Sinónimos cargados</h3>
        {sinonimos.length === 0 ? (
          <p className={styles.vacio}>No hay sinónimos cargados.</p>
        ) : (
          <ul className={styles.lista}>
            {sinonimos.map((sinonimo) => (
              <li className={styles.zona} key={sinonimo.termino}>
                <span>
                  <strong>{sinonimo.termino}</strong>
                  <small>{sinonimo.equivalentes.join(", ")}</small>
                </span>
                <span className={styles.accionesZona}>
                  <Boton
                    onClick={() => {
                      setTermino(sinonimo.termino);
                      setEquivalentes(sinonimo.equivalentes.join(", "));
                    }}
                    type="button"
                    variante="secundario"
                  >
                    Editar
                  </Boton>
                  <Boton
                    disabled={ocupado}
                    onClick={() => void llamar("DELETE", { termino: sinonimo.termino }, "Sinónimo borrado")}
                    type="button"
                    variante="secundario"
                  >
                    Borrar
                  </Boton>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
