import { Fraunces } from "next/font/google";
import Image from "next/image";

import { formatearPrecioBolivianos } from "../../../lib/precios";
import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import { AccionProducto } from "../accion-producto";
import { AccionLlamar } from "../accion-llamar";
import { AvisoHorario } from "../aviso-horario";
import { BannerCatalogo } from "../banner-catalogo";
import { FotoProducto } from "../foto-producto";
import { EstadoStockProducto } from "../estado-stock-producto";
import { InsigniaProducto, insigniaDe } from "../insignias-producto";
import temaStyles from "../tema-catalogo.module.css";
import styles from "./plantilla-clasica.module.css";

/* Serif editorial con eje optico variable: los titulos de capitulo piden
   contraste alto y el cuerpo no. Reemplaza a Georgia, que era el default del
   sistema y no una eleccion. */
const fuente = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--fuente-clasica",
});

export function PlantillaClasica({
  datos,
  paleta = "mercado",
  demostracion = true,
  cantidadesCarrito = {},
  alAgregarProducto,
  alAbrirWhatsapp,
  alVerProducto,
  navegacion,
}: PropiedadesPlantilla) {
  return (
    <article
      className={`${fuente.variable} ${temaStyles.tema} ${styles.plantilla}`}
      data-paleta={paleta}
      aria-label={demostracion ? "Vista previa de plantilla clásica" : `Catálogo de ${datos.negocio.nombre}`}
    >
      <header className={styles.cabecera}>
        {datos.negocio.portadaUrl ? (
          <div className={styles.portadaImagen}>
            <Image alt={`Portada de ${datos.negocio.nombre}`} fill sizes="(min-width: 60rem) 800px, 100vw" src={datos.negocio.portadaUrl} />
          </div>
        ) : null}
        <div className={styles.identidad}>
          {datos.negocio.logoUrl ? (
            <Image className={styles.logo} alt={`Logo de ${datos.negocio.nombre}`} height={96} src={datos.negocio.logoUrl} width={96} />
          ) : null}
          <div>
            <p className={styles.sello}>Carta del negocio</p>
            <h3>{datos.negocio.nombre}</h3>
            <p>{datos.negocio.descripcion}</p>
            {datos.negocio.atencion.texto && !datos.negocio.atencion.aviso ? (
              <span className={styles.horario}>{datos.negocio.atencion.texto}</span>
            ) : null}
          </div>
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
        {(navegacion?.categorias ?? datos.categorias).map((categoria) => {
          const activa = navegacion?.activa === categoria.id;
          return (
            <button
              aria-pressed={navegacion ? activa : undefined}
              className={activa ? styles.categoriaActiva : undefined}
              key={categoria.id}
              onClick={() => navegacion?.alElegir(categoria.id)}
              type="button"
            >
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

      <div className={styles.categorias}>
        {datos.categorias.map((categoria) => {
          const productos = [
            ...categoria.productos.map((producto) => ({ ...producto, subcategoria: null })),
            ...(categoria.subcategorias ?? []).flatMap((subcategoria) =>
              subcategoria.productos.map((producto) => ({
                ...producto,
                subcategoria: subcategoria.nombre,
              })),
            ),
          ];
          return <section className={styles.categoria} id={`categoria-${categoria.id}`} key={categoria.id}>
            <div className={styles.tituloCategoria}>
              <span aria-hidden="true">◆</span>
              <h4>{categoria.nombre}</h4>
              <span aria-hidden="true">◆</span>
            </div>
            <ul>
              {productos.map((producto) => (
                <li className={styles.producto} key={producto.id}>
                  <FotoProducto
                    alVerProducto={alVerProducto}
                    ancho={800}
                    insignias={<InsigniaProducto producto={producto} />}
                    producto={producto}
                    respaldo={<span className={styles.sinImagen}>Sin foto</span>}
                    sizes="(min-width: 64rem) 260px, (min-width: 48rem) 30vw, 50vw"
                  />
                  <div>
                    {producto.subcategoria ? <span className={styles.subcategoria}>{producto.subcategoria}</span> : null}
                    <h5>{producto.nombre}</h5>
                    <p>{producto.descripcion}</p>
                    {/* Lo que ya dijo la pastilla sobre la foto no se repite
                        debajo del nombre: en una tarjeta chica, la misma frase
                        dos veces ocupa el lugar de la descripción. */}
                    {insigniaDe(producto) === null ? (
                      <EstadoStockProducto className={styles.stock} producto={producto} />
                    ) : null}
                    <AccionProducto
                      alAgregarProducto={alAgregarProducto}
                      alAbrirWhatsapp={alAbrirWhatsapp}
                      cantidad={cantidadesCarrito[producto.id]}
                      demostracion={demostracion}
                      modalidad={datos.negocio.modalidad}
                      permiteAcciones={datos.negocio.atencion.permiteAcciones}
                      producto={producto}
                    />
                  </div>
                  <div className={styles.precio}>
                    {producto.tienePromocion ? (
                      <s>{formatearPrecioBolivianos(producto.precioOriginal)}</s>
                    ) : null}
                    <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
                  </div>
                </li>
              ))}
            </ul>
          </section>;
        })}
      </div>

      <BannerCatalogo banner={datos.negocio.banners[1]} />

      <footer className={styles.pie}>
        <p>¿Necesitas ayuda para elegir?</p>
        <strong>WhatsApp {datos.negocio.telefonoWhatsapp}</strong>
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
        {demostracion && datos.negocio.modalidad === "carrito" ? (
          <button type="button">Ver mi pedido · 2 productos</button>
        ) : null}
      </footer>
    </article>
  );
}
