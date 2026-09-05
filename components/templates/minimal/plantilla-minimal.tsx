import { Karla } from "next/font/google";
import Image from "next/image";

import { formatearPrecioBolivianos } from "../../../lib/precios";
import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import { AccionProducto } from "../accion-producto";
import { AvisoHorario } from "../aviso-horario";
import { EstadoStockProducto } from "../estado-stock-producto";
import temaStyles from "../tema-catalogo.module.css";
import styles from "./plantilla-minimal.module.css";

/* Humanista de terminaciones abiertas y aire generoso: la plantilla de
   servicios se lee de corrido, no se escanea. Reemplaza a Arial. */
const fuente = Karla({
  subsets: ["latin"],
  display: "swap",
  variable: "--fuente-minimal",
});

export function PlantillaMinimal({
  datos,
  paleta = "mercado",
  demostracion = true,
  cantidadesCarrito = {},
  alAgregarProducto,
  alAbrirWhatsapp,
  navegacion,
}: PropiedadesPlantilla) {
  return (
    <article
      className={`${fuente.variable} ${temaStyles.tema} ${styles.plantilla}`}
      data-paleta={paleta}
      aria-label={demostracion ? "Vista previa de plantilla mínima" : `Catálogo de ${datos.negocio.nombre}`}
    >
      {datos.negocio.portadaUrl ? (
        <div className={styles.portadaImagen}>
          <Image alt={`Portada de ${datos.negocio.nombre}`} fill sizes="(min-width: 60rem) 800px, 100vw" src={datos.negocio.portadaUrl} />
        </div>
      ) : null}
      <header className={styles.cabecera}>
        <div className={styles.identidad}>
          {datos.negocio.logoUrl ? (
            <Image alt={`Logo de ${datos.negocio.nombre}`} height={80} src={datos.negocio.logoUrl} width={80} />
          ) : null}
          <div>
            <p className={styles.etiqueta}>Atención personalizada</p>
            <h3>{datos.negocio.nombre}</h3>
            <p>{datos.negocio.descripcion}</p>
          </div>
        </div>
        <div className={styles.contacto}>
          {datos.negocio.atencion.texto && !datos.negocio.atencion.aviso ? (
            <span>{datos.negocio.atencion.texto}</span>
          ) : null}
          <small>WhatsApp {datos.negocio.telefonoWhatsapp}</small>
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
      <nav className={styles.navegacion} aria-label="Secciones del catálogo">
        {navegacion ? (
          <button
            aria-pressed={navegacion.activa === ""}
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

      <div className={styles.servicios}>
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
          return <section className={styles.categoria} id={categoria.id} key={categoria.id}>
            <h4>{categoria.nombre}</h4>
            <dl>
              {productos.map((producto) => (
                <div className={styles.servicio} key={producto.id}>
                  {producto.imagen ? (
                    <Image
                      alt={producto.imagen.alt}
                      height={800}
                      sizes="64px"
                      src={producto.imagen.src}
                      width={800}
                    />
                  ) : <span className={styles.sinImagen}>Sin foto</span>}
                  <dt>
                    {producto.subcategoria ? <span className={styles.subcategoria}>{producto.subcategoria}</span> : null}
                    {producto.nombre}
                  </dt>
                  <dd>{producto.descripcion}</dd>
                  <dd className={styles.precio}>
                    {producto.tienePromocion ? (
                      <s>{formatearPrecioBolivianos(producto.precioOriginal)}</s>
                    ) : null}
                    <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
                    {producto.tienePromocion ? <small>Oferta vigente</small> : null}
                  </dd>
                  {producto.estado === "agotado" ? <dd><span className={styles.agotado}>Agotado</span></dd> : null}
                  {producto.controlaStock ? (
                    <dd><EstadoStockProducto className={styles.stock} producto={producto} /></dd>
                  ) : null}
                  {datos.negocio.modalidad !== "solo_lectura" ? (
                    <dd>
                      <AccionProducto
                        alAgregarProducto={alAgregarProducto}
                        alAbrirWhatsapp={alAbrirWhatsapp}
                        cantidad={cantidadesCarrito[producto.id]}
                        demostracion={demostracion}
                        modalidad={datos.negocio.modalidad}
                        permiteAcciones={datos.negocio.atencion.permiteAcciones}
                        producto={producto}
                      />
                    </dd>
                  ) : null}
                </div>
              ))}
            </dl>
          </section>;
        })}
      </div>

      <footer className={styles.pie}>
        <p>Cuéntanos qué necesitas y te orientamos personalmente.</p>
        {datos.negocio.redesSociales.length ? (
          <nav aria-label="Enlaces del negocio" className={styles.redes}>
            {datos.negocio.redesSociales.map((red) => (
              <a href={red.url} key={red.nombre} rel="noreferrer" target="_blank">{red.nombre}</a>
            ))}
          </nav>
        ) : null}
        {demostracion && datos.negocio.modalidad === "carrito" ? (
          <button type="button">Revisar mi pedido</button>
        ) : null}
      </footer>
    </article>
  );
}
