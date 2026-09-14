"use client";

import Image from "next/image";

import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import { IconoCatalogo } from "../../iconos/icono-catalogo";
import { AccionLlamar } from "../accion-llamar";
import { AvisoHorario } from "../aviso-horario";
import { BannerCatalogo } from "../banner-catalogo";
import temaStyles from "../tema-catalogo.module.css";
import { BarraInferior } from "./barra-inferior";
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

  /* Hay ofertas si algún producto visible tiene promoción. Decide la pestaña
     «Ofertas» de la barra: sin promociones activas no se ofrece. */
  const hayOfertas = datos.categorias.some((categoria) =>
    [...categoria.productos, ...(categoria.subcategorias ?? []).flatMap((s) => s.productos)].some(
      (producto) => producto.tienePromocion,
    ),
  );

  const productosEnCarrito = Object.values(cantidadesCarrito).filter((cantidad) => cantidad > 0)
    .length;

  const irA = (id: string) => {
    if (typeof document === "undefined") return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <article
      className={`${temaStyles.tema} ${styles.catalogo}`}
      data-paleta={paleta}
      aria-label={
        demostracion ? "Vista previa del catálogo" : `Catálogo de ${negocio.nombre}`
      }
    >
      {/* 1 · Cabecera: logo, nombre y —cuando exista— el acceso al carrito. */}
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
            {negocio.descripcion ? <p>{negocio.descripcion}</p> : null}
          </div>
        </div>
      </header>

      {/* 2 · Buscador. Siempre presente cuando el catálogo es interactivo. */}
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

      {/* 3 · Esferas de categoría: todas las visibles, con su ícono. Sin corte
          en seis: si el negocio tiene doce, se ven las doce. */}
      {esferas.length > 0 ? (
        <nav aria-label="Categorías" className={styles.esferas} id="categorias">
          {navegacion ? (
            <button
              aria-pressed={navegacion.activa === ""}
              className={navegacion.activa === "" ? styles.esferaActiva : styles.esfera}
              onClick={() => navegacion.alElegir("")}
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
                onClick={() => navegacion?.alElegir(categoria.id)}
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

      {/* 4 · Portada. Solo si el negocio subió una: apagada no deja hueco. */}
      {negocio.portadaUrl ? (
        <section className={styles.portada}>
          <Image
            alt={`Portada de ${negocio.nombre}`}
            className={styles.portadaImagen}
            fill
            sizes="(min-width: 60rem) 800px, 100vw"
            src={negocio.portadaUrl}
          />
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

      {/* 10 · Barra inferior fija. No en la vista previa del panel: ahí no hay
          adónde navegar y taparía el contenido de la muestra. */}
      {!demostracion ? (
        <BarraInferior
          alAbrirCarrito={() => irA("productos")}
          alIrCategorias={() => irA("categorias")}
          alIrInicio={() => irA("inicio")}
          alIrOfertas={() => irA("productos")}
          hayOfertas={hayOfertas}
          modalidad={negocio.modalidad}
          productosEnCarrito={productosEnCarrito}
          telefonoWhatsapp={negocio.telefonoWhatsapp}
          ubicacionUrl={negocio.ubicacionUrl}
        />
      ) : null}
    </article>
  );
}
