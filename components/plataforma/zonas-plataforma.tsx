"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  CENTRO_DE_BOLIVIA,
  CENTRO_DE_CIUDAD,
  type Punto,
} from "../../lib/negocios/coordenadas";
import { CIUDADES, NOMBRES_CIUDADES, nombreDeCiudad } from "../../lib/negocios/lugares";
import { MapaPin } from "../negocios/mapa-pin";
import { Boton, Campo, Selector, useAvisos } from "../ui";
import styles from "./zonas-plataforma.module.css";

/* Las zonas de cada ciudad, y los negocios que esperan una. Fase 11.
 *
 * Arriba se carga o se edita una zona: ciudad, nombre y su punto central en el
 * mapa. El punto es lo que después asigna la zona sola a un negocio según dónde
 * puso su pin, así que conviene marcarlo en el medio del barrio y no en una
 * esquina.
 *
 * Abajo, los negocios que tienen ciudad y todavía no tienen zona —porque
 * escribieron «Mi zona no está», porque su pin cayó lejos de todas, o porque
 * son de antes de la fase 11—, con lo que propusieron, para asignarles una.
 */

export type ZonaPlataforma = {
  id: string;
  ciudad: string;
  nombre: string;
  latitud: number;
  longitud: number;
  activa: boolean;
};

export type NegocioSinZona = {
  id: string;
  nombre: string;
  ciudad: string;
  zona_propuesta: string | null;
};

type Borrador = { id: string | null; ciudad: string; nombre: string; punto: Punto | null };

const VACIO: Borrador = { id: null, ciudad: "oruro", nombre: "", punto: null };

export function ZonasPlataforma({
  zonas,
  sinZona,
}: {
  zonas: ZonaPlataforma[];
  sinZona: NegocioSinZona[];
}) {
  const router = useRouter();
  const { mostrarAviso } = useAvisos();
  const [borrador, setBorrador] = useState<Borrador>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>({});

  async function llamar(metodo: "POST" | "PATCH", cuerpo: Record<string, unknown>, exito: string) {
    setOcupado(true);
    setErrores({});
    try {
      const respuesta = await fetch("/api/plataforma/zonas", {
        method: metodo,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        errores?: Record<string, string>;
      };
      if (!respuesta.ok) {
        setErrores(datos.errores ?? {});
        throw new Error(datos.error || "No se pudo guardar.");
      }
      mostrarAviso({ titulo: exito, variante: "exito" });
      router.refresh();
      return true;
    } catch (causa) {
      mostrarAviso({
        titulo: "No se pudo guardar",
        mensaje: causa instanceof Error ? causa.message : "Intenta de nuevo.",
        variante: "error",
      });
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function guardarZona(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const cuerpo = {
      id: borrador.id,
      ciudad: borrador.ciudad,
      nombre: borrador.nombre,
      latitud: borrador.punto?.lat,
      longitud: borrador.punto?.lng,
    };
    const listo = await llamar(
      borrador.id ? "PATCH" : "POST",
      cuerpo,
      borrador.id ? "Zona guardada" : "Zona creada",
    );
    if (listo) setBorrador({ ...VACIO, ciudad: borrador.ciudad });
  }

  const porCiudad = CIUDADES.map((ciudad) => ({
    ciudad,
    zonas: zonas.filter((zona) => zona.ciudad === ciudad),
  })).filter(({ zonas: deLaCiudad }) => deLaCiudad.length > 0);

  return (
    <section aria-labelledby="titulo-zonas" className={styles.zonas}>
      <header className={styles.cabecera}>
        <h2 id="titulo-zonas">Zonas</h2>
        <p>
          Las zonas de cada ciudad, como las dice la gente. El punto central es el que decide a qué
          zona pertenece un negocio según dónde puso su pin, hasta 3 km a la redonda.
        </p>
      </header>

      <form className={styles.formulario} onSubmit={guardarZona}>
        <h3>{borrador.id ? `Editar «${borrador.nombre}»` : "Nueva zona"}</h3>
        <div className={styles.fila}>
          <Selector
            error={errores.ciudad}
            etiqueta="Ciudad"
            id="zona-ciudad"
            onChange={(evento) => setBorrador({ ...borrador, ciudad: evento.target.value, punto: null })}
            required
            value={borrador.ciudad}
          >
            {CIUDADES.map((id) => (
              <option key={id} value={id}>
                {NOMBRES_CIUDADES[id]}
              </option>
            ))}
          </Selector>
          <Campo
            error={errores.nombre}
            etiqueta="Nombre de la zona"
            id="zona-nombre"
            maxLength={60}
            onChange={(evento) => setBorrador({ ...borrador, nombre: evento.target.value })}
            placeholder="Como la dice la gente"
            required
            value={borrador.nombre}
          />
        </div>
        <p className={styles.ayuda}>Toca el mapa en el centro de la zona.</p>
        <MapaPin
          alCambiar={(punto) => setBorrador((actual) => ({ ...actual, punto }))}
          centro={CENTRO_DE_CIUDAD[borrador.ciudad] ?? CENTRO_DE_BOLIVIA}
          etiqueta="Centro de la zona"
          key={borrador.id ?? `nueva-${borrador.ciudad}`}
          valor={borrador.punto}
          zoom={14}
        />
        {errores.punto ? <strong className={styles.error}>{errores.punto}</strong> : null}
        <div className={styles.acciones}>
          <Boton cargando={ocupado} disabled={!borrador.punto || borrador.nombre.trim() === ""} type="submit">
            {borrador.id ? "Guardar cambios" : "Crear zona"}
          </Boton>
          {borrador.id ? (
            <Boton onClick={() => setBorrador({ ...VACIO, ciudad: borrador.ciudad })} type="button" variante="secundario">
              Cancelar
            </Boton>
          ) : null}
        </div>
      </form>

      {porCiudad.length === 0 ? (
        <p className={styles.vacio}>Todavía no hay zonas. Empieza por las de Oruro.</p>
      ) : (
        porCiudad.map(({ ciudad, zonas: deLaCiudad }) => (
          <div className={styles.ciudad} key={ciudad}>
            <h3>{NOMBRES_CIUDADES[ciudad]}</h3>
            <ul className={styles.lista}>
              {deLaCiudad.map((zona) => (
                <li className={zona.activa ? styles.zona : styles.zonaDeBaja} key={zona.id}>
                  <span>
                    <strong>{zona.nombre}</strong>
                    {zona.activa ? null : <small>De baja: no se ofrece</small>}
                  </span>
                  <span className={styles.accionesZona}>
                    <Boton
                      onClick={() =>
                        setBorrador({
                          id: zona.id,
                          ciudad: zona.ciudad,
                          nombre: zona.nombre,
                          punto: { lat: zona.latitud, lng: zona.longitud },
                        })
                      }
                      type="button"
                      variante="secundario"
                    >
                      Editar
                    </Boton>
                    <Boton
                      disabled={ocupado}
                      onClick={() =>
                        void llamar(
                          "PATCH",
                          { id: zona.id, accion: "activa", activa: !zona.activa },
                          zona.activa ? "Zona dada de baja" : "Zona reactivada",
                        )
                      }
                      type="button"
                      variante="secundario"
                    >
                      {zona.activa ? "Dar de baja" : "Reactivar"}
                    </Boton>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <div className={styles.pendientes}>
        <h3>Negocios sin zona</h3>
        {sinZona.length === 0 ? (
          <p className={styles.vacio}>Todos los negocios con ciudad tienen su zona.</p>
        ) : (
          <ul className={styles.lista}>
            {sinZona.map((negocio) => {
              const opciones = zonas.filter((zona) => zona.activa && zona.ciudad === negocio.ciudad);
              return (
                <li className={styles.pendiente} key={negocio.id}>
                  <span>
                    <strong>{negocio.nombre}</strong>
                    <small>
                      {nombreDeCiudad(negocio.ciudad)}
                      {negocio.zona_propuesta ? `. Propuso: «${negocio.zona_propuesta}»` : ". No propuso zona"}
                    </small>
                  </span>
                  {opciones.length === 0 ? (
                    <small>Crea primero una zona de {nombreDeCiudad(negocio.ciudad)}.</small>
                  ) : (
                    <span className={styles.asignar}>
                      <label className={styles.soloLectores} htmlFor={`asignar-${negocio.id}`}>
                        Zona para {negocio.nombre}
                      </label>
                      <select
                        id={`asignar-${negocio.id}`}
                        onChange={(evento) =>
                          setAsignaciones({ ...asignaciones, [negocio.id]: evento.target.value })
                        }
                        value={asignaciones[negocio.id] ?? ""}
                      >
                        <option value="">Elige la zona</option>
                        {opciones.map((zona) => (
                          <option key={zona.id} value={zona.id}>
                            {zona.nombre}
                          </option>
                        ))}
                      </select>
                      <Boton
                        disabled={ocupado || !asignaciones[negocio.id]}
                        onClick={() =>
                          void llamar(
                            "PATCH",
                            { accion: "asignar", negocio_id: negocio.id, zona_id: asignaciones[negocio.id] },
                            "Zona asignada",
                          )
                        }
                        type="button"
                      >
                        Asignar
                      </Boton>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
