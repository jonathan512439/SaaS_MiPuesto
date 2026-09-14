"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import { Icono } from "../../iconos/icono";
import { IconoCatalogo } from "../../iconos/icono-catalogo";
import { AccionLlamar } from "../accion-llamar";
import { AvisoHorario } from "../aviso-horario";
import { BannerCatalogo } from "../banner-catalogo";
import temaStyles from "../tema-catalogo.module.css";
import { TarjetaMipuesto } from "./tarjeta-mipuesto";
import styles from "./plantilla-mipuesto.module.css";

/* El catálogo único, adaptado del diseño de `Catalogos_Ejemplo/`.
 *
 * Reemplaza a las cinco plantillas: hay un solo diseño, y lo que cambia entre
 * una veterinaria y una ferretería no es la estructura de la página, son sus
 * categorías, sus campos y sus acciones.
 *
 * Los bloques van en el orden del diseño de referencia. Cada bloque opcional
 * —portada, banners, esferas— **apagado no deja hueco**: no se dibuja, sin
 * margen fantasma. Lo que la maqueta traía inventado —calificaciones, reseñas,
 * pestañas de cuenta— no está: el sistema no muestra lo que no es cierto.
 */
export function PlantillaMipuesto({
  datos,
  paleta = "mercado",
  demostracion = true,
  cantidadesCarrito = {},
  alAgregarProducto,
  alAbrirWhatsapp,
  alVerProducto,
  navegacion,
}: PropiedadesPlantilla) {
  const { negocio } = datos;
  const esferas = navegacion?.categorias ?? datos.categorias;

  const irA = (id: string) => {
    if (typeof document === "undefined") return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* Elegir una categoría filtra y salta a los productos: sin el salto, en un
     teléfono el filtro pasa debajo del pliegue y parece que no hizo nada. En la
     vista previa del panel no hay navegación, así que solo hace el desplazamiento
     al ancla, que es el comportamiento de siempre. */
  const elegirEsfera = (categoriaId: string) => {
    navegacion?.alElegir(categoriaId);
    irA("productos");
  };

  /* El botón «volver arriba» aparece recién cuando hay algo arriba a lo que
     volver. Sin esto, en un catálogo corto sería un botón que no sirve. No se
     dibuja en la vista previa del panel, que no desplaza. */
  const [mostrarSubir, setMostrarSubir] = useState(false);
  useEffect(() => {
    if (demostracion) return;
    const alDesplazar = () => setMostrarSubir(window.scrollY > 600);
    alDesplazar();
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, [demostracion]);

  return (
    <article
      className={`${temaStyles.tema} ${styles.catalogo}`}
      data-paleta={paleta}
      aria-label={
        demostracion ? "Vista previa del catálogo" : `Catálogo de ${negocio.nombre}`
      }
    >
      {/* 1 · Cabecera pintada con la paleta: logo, nombre y —si publicó su
          ubicación— el botón para llegar. La descripción vive acá solo cuando no
          hay portada; con portada la lleva el hero, para no repetirla. */}
      <header className={styles.cabecera} id="inicio">
        <div className={styles.identidad}>
          {negocio.logoUrl ? (
            <Image
              alt={`Logo de ${negocio.nombre}`}
              className={styles.logo}
              height={56}
              src={negocio.logoUrl}
              width={56}
            />
          ) : (
            <span className={styles.logoVacio} aria-hidden="true">
              {negocio.nombre.slice(0, 1)}
            </span>
          )}
          <div className={styles.identidadTexto}>
            <h2>{negocio.nombre}</h2>
            {/* El subnombre es el renglón hecho para este lugar —«Pollos a la
                brasa», «Desde 1998»— así que gana cuando está. Sin él cae a la
                descripción, y solo si no hay portada, porque con portada esa
                misma descripción ya la lleva el hero. */}
            {negocio.subnombre ? (
              <p>{negocio.subnombre}</p>
            ) : negocio.descripcion && !negocio.portadaUrl ? (
              <p>{negocio.descripcion}</p>
            ) : null}
          </div>
        </div>
        {negocio.ubicacionUrl ? (
          <a
            className={styles.botonMapa}
            href={negocio.ubicacionUrl}
            rel="noreferrer noopener"
            target="_blank"
          >
            <Icono nombre="ubicacion" />
            <span>Cómo llegar</span>
          </a>
        ) : null}
      </header>

      {/* 2 y 3 · Buscador y esferas, pegados arriba al desplazar: son con lo que
          se navega, y en un catálogo largo tenerlos siempre a mano evita subir
          hasta arriba para cambiar de categoría. */}
      <div className={styles.barraFija}>
        {navegacion ? (
          <search className={styles.buscador}>
            <label className={styles.soloLectores} htmlFor="buscar-en-catalogo">
              Buscar en el catálogo
            </label>
            <input
              autoComplete="off"
              id="buscar-en-catalogo"
              onChange={(evento) => navegacion.alBuscar(evento.target.value)}
              placeholder={`Buscar en ${negocio.nombre}`}
              type="search"
              value={navegacion.busqueda}
            />
          </search>
        ) : null}

        {esferas.length > 0 ? (
          <nav aria-label="Categorías" className={styles.esferas} id="categorias">
            {navegacion ? (
              <button
                aria-pressed={navegacion.activa === ""}
                className={navegacion.activa === "" ? styles.esferaActiva : styles.esfera}
                onClick={() => elegirEsfera("")}
                type="button"
              >
                <span className={styles.esferaIcono} aria-hidden="true">
                  <IconoCatalogo nombre="tienda" />
                </span>
                <span className={styles.esferaNombre}>Todo</span>
              </button>
            ) : null}
            {esferas.map((categoria) => {
              const activa = navegacion?.activa === categoria.id;
              return (
                <button
                  aria-pressed={navegacion ? activa : undefined}
                  className={activa ? styles.esferaActiva : styles.esfera}
                  key={categoria.id}
                  onClick={() => elegirEsfera(categoria.id)}
                  type="button"
                >
                  <span className={styles.esferaIcono} aria-hidden="true">
                    <IconoCatalogo nombre={categoria.icono} />
                  </span>
                  <span className={styles.esferaNombre}>{categoria.nombre}</span>
                </button>
              );
            })}
          </nav>
        ) : null}
      </div>

      {/* 4 · Portada con hero encima: título, bajada y botón. Solo si el negocio
          subió una imagen; apagada no deja hueco. */}
      {negocio.portadaUrl ? (
        <section className={styles.portada}>
          <Image
            alt={`Portada de ${negocio.nombre}`}
            className={styles.portadaImagen}
            fill
            sizes="(min-width: 60rem) 800px, 100vw"
            src={negocio.portadaUrl}
          />
          <div className={styles.hero}>
            <h1 className={styles.heroTitulo}>{negocio.nombre}</h1>
            {negocio.descripcion ? <p className={styles.heroBajada}>{negocio.descripcion}</p> : null}
            <button className={styles.heroBoton} onClick={() => irA("productos")} type="button">
              Ver productos
            </button>
          </div>
        </section>
      ) : null}

      {/* 5 · Franja de horario. Se dibuja sola solo cuando hay algo que decir. */}
      <AvisoHorario estado={negocio.atencion} />

      {navegacion ? (
        <p aria-live="polite" className={styles.conteo}>
          {navegacion.totalProductos === 1
            ? "1 producto"
            : `${navegacion.totalProductos} productos`}
        </p>
      ) : null}

      {/* 7 · Productos, agrupados por categoría, con la tarjeta única. */}
      <div className={styles.secciones} id="productos">
        {datos.categorias.map((categoria) => {
          const productos = [
            ...categoria.productos.map((producto) => ({
              ...producto,
              categoria: categoria.nombre,
              subcategoria: null,
            })),
            ...(categoria.subcategorias ?? []).flatMap((subcategoria) =>
              subcategoria.productos.map((producto) => ({
                ...producto,
                categoria: categoria.nombre,
                subcategoria: subcategoria.nombre,
              })),
            ),
          ];
          if (productos.length === 0) return null;
          return (
            <section className={styles.seccion} id={`categoria-${categoria.id}`} key={categoria.id}>
              <div className={styles.seccionCabecera}>
                <h3 className={styles.seccionTitulo}>{categoria.nombre}</h3>
                <span className={styles.seccionCuenta}>
                  {productos.length === 1 ? "1 producto" : `${productos.length} productos`}
                </span>
              </div>
              <ul className={styles.rejilla}>
                {productos.map((producto) => (
                  <TarjetaMipuesto
                    alAgregarProducto={alAgregarProducto}
                    alAbrirWhatsapp={alAbrirWhatsapp}
                    alVerProducto={alVerProducto}
                    cantidadEnCarrito={cantidadesCarrito[producto.id]}
                    demostracion={demostracion}
                    key={producto.id}
                    modalidad={negocio.modalidad}
                    permiteAcciones={negocio.atencion.permiteAcciones}
                    producto={producto}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* 8 · Banner de abajo, opcional. */}
      <BannerCatalogo banner={negocio.banners[1]} />

      {/* 9 · Pie: cómo contactar y cómo llegar. */}
      <footer className={styles.pie}>
        <strong>WhatsApp {negocio.telefonoWhatsapp}</strong>
        <div className={styles.pieAcciones}>
          <AccionLlamar className={styles.pieEnlace} telefono={negocio.telefonoWhatsapp} />
          {negocio.ubicacionUrl ? (
            <a className={styles.pieEnlace} href={negocio.ubicacionUrl} rel="noreferrer" target="_blank">
              Cómo llegar
            </a>
          ) : null}
        </div>
        {negocio.redesSociales.length ? (
          <nav aria-label="Enlaces del negocio" className={styles.redes}>
            {negocio.redesSociales.map((red) => (
              <a href={red.url} key={red.nombre} rel="noreferrer" target="_blank">
                {red.nombre}
              </a>
            ))}
          </nav>
        ) : null}
      </footer>

      {/* Volver arriba: aparece al desplazar, y queda por encima de la barra
          inferior fija para no taparse con ella. */}
      {mostrarSubir ? (
        <button
          aria-label="Volver arriba"
          className={styles.subir}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          type="button"
        >
          <Icono nombre="flechaArriba" />
        </button>
      ) : null}
    </article>
  );
}
