import Image from "next/image";

import { formatearPrecioBolivianos } from "../../../lib/precios";
import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import temaStyles from "../tema-catalogo.module.css";
import styles from "./plantilla-moderna.module.css";

export function PlantillaModerna({
  datos,
  paleta = "mercado",
  demostracion = true,
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
        <div className={styles.barraSuperior}>
          <strong>{datos.negocio.nombre}</strong>
          <span>{datos.negocio.horarioTexto}</span>
        </div>
        <div className={styles.presentacion}>
          <p>Compra local, elige fácil</p>
          <h3>{datos.negocio.nombre}</h3>
          <p>{datos.negocio.descripcion}</p>
          {demostracion ? <button type="button">Explorar productos</button> : null}
        </div>
      </header>

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

      <ul className={styles.productos}>
        {productos.map((producto) => (
          <li className={styles.producto} id={producto.anclaCategoria} key={producto.id}>
            {producto.imagen ? (
              <Image
                alt={producto.imagen.alt}
                className={styles.imagen}
                height={800}
                sizes="(min-width: 60rem) 176px, 50vw"
                src={producto.imagen.src}
                width={800}
              />
            ) : <span className={styles.sinImagen}>Sin foto</span>}
            <div className={styles.detalle}>
              <p>{producto.subcategoria ? `${producto.categoria} / ${producto.subcategoria}` : producto.categoria}</p>
              <h4>{producto.nombre}</h4>
              <span>{producto.descripcion}</span>
              <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
              {producto.estado === "agotado" ? <span className={styles.agotado}>Agotado</span> : null}
              {demostracion ? <button type="button" aria-label={`Añadir ${producto.nombre} al pedido`}>Agregar +</button> : null}
            </div>
          </li>
        ))}
      </ul>

      <footer className={styles.pie}>
        <span>{demostracion ? "2 productos · Bs 77,00" : `WhatsApp ${datos.negocio.telefonoWhatsapp}`}</span>
        {demostracion ? <button type="button">Continuar por WhatsApp</button> : null}
      </footer>
    </article>
  );
}
