import Image from "next/image";

import { formatearPrecioBolivianos } from "../../../lib/precios";
import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import { AccionProducto } from "../accion-producto";
import { AvisoHorario } from "../aviso-horario";
import { EstadoStockProducto } from "../estado-stock-producto";
import temaStyles from "../tema-catalogo.module.css";
import styles from "./plantilla-moderna.module.css";

export function PlantillaModerna({
  datos,
  paleta = "mercado",
  demostracion = true,
  cantidadesCarrito = {},
  alAgregarProducto,
  ocultarNavegacionCategorias = false,
  navegacionCatalogo,
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
      className={`${temaStyles.tema} ${styles.plantilla}`}
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

      {navegacionCatalogo}

      {!ocultarNavegacionCategorias ? (
        <nav className={styles.navegacion} aria-label="Categorías del catálogo">
          {datos.categorias.map((categoria, indice) => (
            demostracion ? (
              <button className={indice === 0 ? styles.categoriaActiva : undefined} type="button" key={categoria.id}>
                {categoria.nombre}
              </button>
            ) : (
              <a className={indice === 0 ? styles.categoriaActiva : undefined} href={`#categoria-${categoria.id}`} key={categoria.id}>
                {categoria.nombre}
              </a>
            )
          ))}
        </nav>
      ) : null}

      <ul className={styles.productos}>
        {productos.map((producto) => (
          <li className={styles.producto} id={producto.anclaCategoria} key={producto.id}>
            {producto.imagen ? (
              <Image
                alt={producto.imagen.alt}
                className={styles.imagen}
                height={800}
                sizes="(min-width: 64rem) 260px, (min-width: 48rem) 30vw, 50vw"
                src={producto.imagen.src}
                width={800}
              />
            ) : <span className={styles.sinImagen}>Sin foto</span>}
            <div className={styles.detalle}>
              <p>{producto.subcategoria ? `${producto.categoria} / ${producto.subcategoria}` : producto.categoria}</p>
              <h4>{producto.nombre}</h4>
              <span>{producto.descripcion}</span>
              <div className={styles.precio}>
                {producto.tienePromocion ? (
                  <s>{formatearPrecioBolivianos(producto.precioOriginal)}</s>
                ) : null}
                <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
                {producto.tienePromocion ? <small>Precio promocional</small> : null}
              </div>
              {producto.estado === "agotado" ? <span className={styles.agotado}>Agotado</span> : null}
              <EstadoStockProducto className={styles.stock} producto={producto} />
              <AccionProducto
                alAgregarProducto={alAgregarProducto}
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
              <a href={red.url} key={red.nombre} rel="noreferrer" target="_blank">{red.nombre}</a>
            ))}
          </nav>
        ) : null}
      </footer>
    </article>
  );
}
