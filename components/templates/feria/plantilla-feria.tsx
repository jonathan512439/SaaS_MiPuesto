import { Roboto_Condensed } from "next/font/google";
import Image from "next/image";

import { formatearPrecioBolivianos } from "../../../lib/precios";
import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import { AccionProducto } from "../accion-producto";
import { AvisoHorario } from "../aviso-horario";
import { FotoProducto } from "../foto-producto";
import { EstadoStockProducto } from "../estado-stock-producto";
import temaStyles from "../tema-catalogo.module.css";
import styles from "./plantilla-feria.module.css";

/* Condensada: en un puesto el precio se escribe grande y el ancho de la
   pizarra no crece. La misma restricción vale acá, donde el precio tiene que
   leerse de lejos sin empujar el nombre del producto fuera de la fila. */
const fuente = Roboto_Condensed({
  subsets: ["latin"],
  display: "swap",
  variable: "--fuente-feria",
});

export function PlantillaFeria({
  datos,
  paleta = "mercado",
  demostracion = true,
  cantidadesCarrito = {},
  alAgregarProducto,
  alAbrirWhatsapp,
  alVerFotos,
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
      aria-label={
        demostracion ? "Vista previa de plantilla feria" : `Catálogo de ${datos.negocio.nombre}`
      }
    >
      <header className={styles.cartel}>
        {datos.negocio.portadaUrl ? (
          <div className={styles.portadaImagen}>
            <Image
              alt={`Portada de ${datos.negocio.nombre}`}
              fill
              sizes="(min-width: 60rem) 900px, 100vw"
              src={datos.negocio.portadaUrl}
            />
          </div>
        ) : null}
        <div className={styles.identidad}>
          {datos.negocio.logoUrl ? (
            <Image
              alt={`Logo de ${datos.negocio.nombre}`}
              height={64}
              src={datos.negocio.logoUrl}
              width={64}
            />
          ) : null}
          <div className={styles.rotulo}>
            <h3>{datos.negocio.nombre}</h3>
            <p>{datos.negocio.descripcion}</p>
          </div>
          {datos.negocio.atencion.texto && !datos.negocio.atencion.aviso ? (
            <span className={styles.atencion}>{datos.negocio.atencion.texto}</span>
          ) : null}
        </div>
      </header>

      <AvisoHorario estado={datos.negocio.atencion} />

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
          <li className={styles.producto} id={producto.anclaCategoria} key={producto.id}>
            <div className={styles.foto}>
              <FotoProducto
                alVerFotos={alVerFotos}
                ancho={240}
                className={styles.imagen}
                producto={producto}
                respaldo={
                  <span className={styles.sinImagen} aria-hidden="true">
                    ·
                  </span>
                }
                sizes="96px"
              />
            </div>

            <div className={styles.info}>
              <h4>{producto.nombre}</h4>
              <p className={styles.rubro}>
                {producto.subcategoria
                  ? `${producto.categoria} / ${producto.subcategoria}`
                  : producto.categoria}
              </p>
              {producto.estado === "agotado" ? (
                <span className={styles.agotado}>Agotado</span>
              ) : null}
              <EstadoStockProducto className={styles.stock} producto={producto} />
            </div>

            <div className={styles.precio}>
              {producto.tienePromocion ? (
                <s>{formatearPrecioBolivianos(producto.precioOriginal)}</s>
              ) : null}
              <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
              {producto.tienePromocion ? <small>Oferta</small> : null}
            </div>

            <div className={styles.accion}>
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
          </li>
        ))}
      </ul>

      <footer className={styles.pie}>
        <span>
          {demostracion && datos.negocio.modalidad === "carrito"
            ? "2 productos · Bs 77,00"
            : `WhatsApp ${datos.negocio.telefonoWhatsapp}`}
        </span>
        {demostracion && datos.negocio.modalidad === "carrito" ? (
          <button type="button">Continuar por WhatsApp</button>
        ) : null}
        {datos.negocio.redesSociales.length ? (
          <nav aria-label="Enlaces del negocio" className={styles.redes}>
            {datos.negocio.redesSociales.map((red) => (
              <a href={red.url} key={red.nombre} rel="noreferrer" target="_blank">
                {red.nombre}
              </a>
            ))}
          </nav>
        ) : null}
      </footer>
    </article>
  );
}
