"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Icono } from "../iconos/icono";
import styles from "./buscador-vivo.module.css";

/* El buscador que responde mientras se escribe.
 *
 * Es un formulario `GET` común con un campo: sin JavaScript busca igual, al
 * apretar Enter. Con JavaScript, a partir de dos letras muestra debajo los
 * negocios y los productos que coinciden, y cada uno lleva directo a su
 * catálogo o a su producto. Enter sigue llevando a la búsqueda completa.
 *
 * Espera un cuarto de segundo desde la última tecla antes de preguntar, y
 * descarta la respuesta de una pregunta vieja: quien escribe rápido no tiene que
 * ver parpadear sugerencias de lo que escribió antes.
 */

type Sugerencias = {
  negocios: Array<{
    slug: string;
    nombre: string;
    rubro: string | null;
    zona: string | null;
    logoUrl: string | null;
    abierto: boolean;
    enlace: string;
  }>;
  productos: Array<{ nombre: string; negocio: string; fotoUrl: string | null; enlace: string }>;
};

const VACIAS: Sugerencias = { negocios: [], productos: [] };

export function BuscadorVivo({
  valorInicial = "",
  ciudad,
  ejemplos,
  tamano = "grande",
  campoOculto,
}: {
  valorInicial?: string;
  /* Si la búsqueda queda dentro de una ciudad. */
  ciudad?: string | null;
  /* Palabras que se van mostrando en el campo vacío, para que se entienda qué
     se puede buscar sin tener que leer una explicación. */
  ejemplos: readonly string[];
  tamano?: "grande" | "compacto";
  /* Filtros que viajan con la búsqueda completa (zona, rubro, cerca). */
  campoOculto?: Record<string, string>;
}) {
  const [texto, setTexto] = useState(valorInicial);
  const [sugerencias, setSugerencias] = useState<Sugerencias>(VACIAS);
  const [abierto, setAbierto] = useState(false);
  const [ejemplo, setEjemplo] = useState(0);
  const pedido = useRef(0);
  const idLista = useId();

  /* Las palabras de ejemplo rotan en el campo vacío. Se detiene si la persona
     prefiere menos movimiento. */
  useEffect(() => {
    if (texto || ejemplos.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const reloj = window.setInterval(() => setEjemplo((actual) => (actual + 1) % ejemplos.length), 2200);
    return () => window.clearInterval(reloj);
  }, [texto, ejemplos.length]);

  useEffect(() => {
    const limpio = texto.trim();
    if (limpio.length < 2) return;
    const numero = ++pedido.current;
    const espera = window.setTimeout(async () => {
      const parametros = new URLSearchParams({ q: limpio });
      if (ciudad) parametros.set("ciudad", ciudad);
      try {
        const respuesta = await fetch(`/api/directorio/sugerencias?${parametros}`);
        const datos = (await respuesta.json()) as Sugerencias;
        /* Solo la respuesta de la última pregunta: las viejas llegan tarde. */
        if (numero === pedido.current) setSugerencias(datos);
      } catch {
        if (numero === pedido.current) setSugerencias(VACIAS);
      }
    }, 250);
    return () => window.clearTimeout(espera);
  }, [texto, ciudad]);

  const escrito = texto.trim().length >= 2;
  const hay = sugerencias.negocios.length + sugerencias.productos.length > 0;
  const mostrar = abierto && escrito;

  return (
    <form action="/directorio" className={styles.buscador} data-tamano={tamano} method="get" role="search">
      <label className={styles.soloLectores} htmlFor={`${idLista}-campo`}>
        ¿Qué buscas?
      </label>
      <div className={styles.campo}>
        <Icono nombre="lupa" />
        <input
          aria-autocomplete="list"
          aria-controls={idLista}
          aria-expanded={mostrar}
          autoComplete="off"
          id={`${idLista}-campo`}
          maxLength={60}
          name="q"
          onBlur={() => window.setTimeout(() => setAbierto(false), 150)}
          onChange={(evento) => {
            setTexto(evento.target.value);
            setAbierto(true);
            if (evento.target.value.trim().length < 2) setSugerencias(VACIAS);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(evento) => {
            if (evento.key === "Escape") setAbierto(false);
          }}
          placeholder={ejemplos.length ? `Prueba «${ejemplos[ejemplo]}»` : "¿Qué buscas?"}
          role="combobox"
          type="search"
          value={texto}
        />
        {ciudad ? <input name="ciudad" type="hidden" value={ciudad} /> : null}
        {Object.entries(campoOculto ?? {}).map(([nombre, valor]) => (
          <input key={nombre} name={nombre} type="hidden" value={valor} />
        ))}
        <button className={styles.boton} type="submit">
          Buscar
        </button>
      </div>

      {mostrar ? (
        <div className={styles.lista} id={idLista} role="listbox">
          {!hay ? (
            <p className={styles.nada}>Enter para buscar «{texto.trim()}» en todo el directorio.</p>
          ) : (
            <>
              {sugerencias.negocios.length > 0 ? (
                <div className={styles.grupo}>
                  <p className={styles.rotulo}>Negocios</p>
                  {sugerencias.negocios.map((negocio) => (
                    <Link className={styles.opcion} href={negocio.enlace} key={negocio.slug} role="option">
                      {negocio.logoUrl ? (
                        <Image alt="" className={styles.logo} height={40} src={negocio.logoUrl} width={40} />
                      ) : (
                        <span aria-hidden="true" className={styles.inicial}>
                          {negocio.nombre.slice(0, 1)}
                        </span>
                      )}
                      <span className={styles.textos}>
                        <strong>{negocio.nombre}</strong>
                        <small>{[negocio.rubro, negocio.zona].filter(Boolean).join(", ")}</small>
                      </span>
                      {negocio.abierto ? <span className={styles.abierto}>Abierto</span> : null}
                    </Link>
                  ))}
                </div>
              ) : null}
              {sugerencias.productos.length > 0 ? (
                <div className={styles.grupo}>
                  <p className={styles.rotulo}>Productos</p>
                  {sugerencias.productos.map((producto) => (
                    <Link className={styles.opcion} href={producto.enlace} key={producto.enlace} role="option">
                      {producto.fotoUrl ? (
                        <Image alt="" className={styles.logo} height={40} src={producto.fotoUrl} width={40} />
                      ) : (
                        <span aria-hidden="true" className={styles.inicial}>
                          {producto.nombre.slice(0, 1)}
                        </span>
                      )}
                      <span className={styles.textos}>
                        <strong>{producto.nombre}</strong>
                        <small>en {producto.negocio}</small>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
              <button className={styles.verTodo} type="submit">
                Ver todos los resultados de «{texto.trim()}»
              </button>
            </>
          )}
        </div>
      ) : null}
    </form>
  );
}
