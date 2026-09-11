import { Archivo } from "next/font/google";
import Image from "next/image";

import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import { AccionLlamar } from "../accion-llamar";
import { AvisoHorario } from "../aviso-horario";
import { BannerCatalogo } from "../banner-catalogo";
import { TarjetaProducto } from "../tarjetas";
import temaStyles from "../tema-catalogo.module.css";
import styles from "./plantilla-moderna.module.css";
import { IconoCatalogo } from "../../iconos/icono-catalogo";

/* Grotesca de asta ancha, pensada para titulares densos. Reemplaza a
   Trebuchet MS, que no sostenia el escaparate de alto contraste que esta
   plantilla promete. */
const fuente = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--fuente-moderna",
});

export function PlantillaModerna({
  datos,
  paleta = "mercado",
  demostracion = true,
  cantidadesCarrito = {},
  alAgregarProducto,
  alAbrirWhatsapp,
  alVerProducto,
  navegacion,
}: PropiedadesPlantilla) {
  const productos = datos.categorias.flatMap((categoria) => {
    const productosCategoria = [
      ...categoria.productos.map((producto) => ({ ...producto, subcategoria: null })),
      ...(categoria.subcategorias ?? []).flatMap((subcategoria) =>
        subcategoria.productos.map((producto) => ({
          ...producto,
          subcategoria: subcategoria.nombre,
        })),
      ),
    ];
    return productosCategoria.map((producto, indice) => ({
      ...producto,
      categoria: categoria.nombre,
      anclaCategoria: indice === 0 ? `categoria-${categoria.id}` : undefined,
    }));
  });

  return (
    <article
      className={`${fuente.variable} ${temaStyles.tema} ${styles.plantilla}`}
      data-paleta={paleta}
      aria-label={demostracion ? "Vista previa de plantilla moderna" : `Catálogo de ${datos.negocio.nombre}`}
    >
      <header className={styles.portada}>
        {datos.negocio.portadaUrl ? (
          <div className={styles.portadaImagen}>
            <Image alt={`Portada de ${datos.negocio.nombre}`} fill sizes="(min-width: 60rem) 800px, 100vw" src={datos.negocio.portadaUrl} />
          </div>
        ) : null}
        <div className={styles.barraSuperior}>
          <div className={styles.marcaNegocio}>
            {datos.negocio.logoUrl ? (
              <Image alt={`Logo de ${datos.negocio.nombre}`} height={64} src={datos.negocio.logoUrl} width={64} />
            ) : null}
            <strong>{datos.negocio.nombre}</strong>
          </div>
          {datos.negocio.atencion.texto && !datos.negocio.atencion.aviso ? (
            <span>{datos.negocio.atencion.texto}</span>
          ) : null}
        </div>
        <div className={styles.presentacion}>
          <p>Compra local, elige fácil</p>
          <h3>{datos.negocio.nombre}</h3>
          <p>{datos.negocio.descripcion}</p>
          {demostracion ? <button type="button">Explorar productos</button> : null}
        </div>
      </header>

      <AvisoHorario estado={datos.negocio.atencion} />

      <BannerCatalogo banner={datos.negocio.banners[0]} />

        {navegacion ? (
          <search className={styles.buscador}>
            <label className={styles.etiquetaBusqueda} htmlFor="buscar-en-catalogo">
              Buscar
            </label>
            <input
              autoComplete="off"
              id="buscar-en-catalogo"
              onChange={(evento) => navegacion.alBuscar(evento.target.value)}
              placeholder="Nombre del producto"
              type="search"
              value={navegacion.busqueda}
            />
          </search>
        ) : null}
      <nav className={styles.navegacion} aria-label="Categorías del catálogo">
        {navegacion ? (
          <button
            aria-pressed={navegacion.activa === ""}
            className={navegacion.activa === "" ? styles.categoriaActiva : undefined}
            onClick={() => navegacion.alElegir("")}
            type="button"
          >
            Todo
          </button>
        ) : null}
        {(navegacion?.categorias ?? datos.categorias).map((categoria, indice) => {
          const activa = navegacion ? navegacion.activa === categoria.id : indice === 0;
          return (
            <button
              aria-pressed={navegacion ? activa : undefined}
              className={activa ? styles.categoriaActiva : undefined}
              key={categoria.id}
              onClick={() => navegacion?.alElegir(categoria.id)}
              type="button"
            >
              {/* El ícono va antes del nombre y es decorativo: al lado está la
                  palabra que dice lo mismo, y anunciarlo obligaría a escucharlo
                  dos veces. */}
              <IconoCatalogo nombre={categoria.icono} />
              {categoria.nombre}
            </button>
          );
        })}
        {navegacion ? (
          <span aria-live="polite" className={styles.conteoCategorias}>
            {navegacion.totalProductos === 1
              ? "1 producto"
              : `${navegacion.totalProductos} productos`}
          </span>
        ) : null}
      </nav>

      <ul className={styles.productos}>
        {productos.map((producto) => (
          <TarjetaProducto
            alAgregarProducto={alAgregarProducto}
            alAbrirWhatsapp={alAbrirWhatsapp}
            alVerProducto={alVerProducto}
            cantidadEnCarrito={cantidadesCarrito[producto.id]}
            demostracion={demostracion}
            key={producto.id}
            modalidad={datos.negocio.modalidad}
            permiteAcciones={datos.negocio.atencion.permiteAcciones}
            producto={producto}
            tarjeta={datos.negocio.tarjeta}
          />
        ))}
      </ul>

      <BannerCatalogo banner={datos.negocio.banners[1]} />

      <footer className={styles.pie}>
        <span>
          {demostracion && datos.negocio.modalidad === "carrito"
            ? "2 productos · Bs 77,00"
            : `WhatsApp ${datos.negocio.telefonoWhatsapp}`}
        </span>
        {demostracion && datos.negocio.modalidad === "carrito" ? (
          <button type="button">Continuar por WhatsApp</button>
        ) : null}
        {/* Llamar antes de «Cómo llegar»: quien mira el pie casi siempre quiere
            preguntar algo, y muy pocos quieren la dirección. */}
        <AccionLlamar className={styles.comoLlegar} telefono={datos.negocio.telefonoWhatsapp} />
        {datos.negocio.ubicacionUrl ? (
          <a
            className={styles.comoLlegar}
            href={datos.negocio.ubicacionUrl}
            rel="noreferrer"
            target="_blank"
          >
            Cómo llegar
          </a>
        ) : null}
        {datos.negocio.redesSociales.length ? (
          <nav aria-label="Enlaces del negocio" className={styles.redes}>
            {datos.negocio.redesSociales.map((red) => (
              <a href={red.url} key={red.nombre} rel="noreferrer" target="_blank">{red.nombre}</a>
            ))}
          </nav>
        ) : null}
      </footer>
    </article>
  );
}
