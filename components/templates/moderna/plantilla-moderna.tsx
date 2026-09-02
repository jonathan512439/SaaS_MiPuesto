import Image from "next/image";

import { formatearPrecioBolivianos } from "../../../lib/precios";
import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import temaStyles from "../tema-catalogo.module.css";
import styles from "./plantilla-moderna.module.css";

export function PlantillaModerna({ datos, paleta = "mercado" }: PropiedadesPlantilla) {
  const productos = datos.categorias.flatMap((categoria) =>
    categoria.productos.map((producto) => ({ ...producto, categoria: categoria.nombre })),
  );

  return (
    <article
      className={`${temaStyles.tema} ${styles.plantilla}`}
      data-paleta={paleta}
      aria-label="Vista previa de plantilla moderna"
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
          <button type="button">Explorar productos</button>
        </div>
      </header>

      <nav className={styles.navegacion} aria-label="Categorías de la demostración">
        {datos.categorias.map((categoria, indice) => (
          <button className={indice === 0 ? styles.categoriaActiva : undefined} type="button" key={categoria.id}>
            {categoria.nombre}
          </button>
        ))}
      </nav>

      <ul className={styles.productos}>
        {productos.map((producto) => (
          <li className={styles.producto} key={producto.id}>
            <Image
              alt={producto.imagen.alt}
              className={styles.imagen}
              height={800}
              sizes="(min-width: 60rem) 176px, 50vw"
              src={producto.imagen.src}
              width={800}
            />
            <div className={styles.detalle}>
              <p>{producto.categoria}</p>
              <h4>{producto.nombre}</h4>
              <span>{producto.descripcion}</span>
              <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
              <button type="button" aria-label={`Añadir ${producto.nombre} al pedido`}>Agregar +</button>
            </div>
          </li>
        ))}
      </ul>

      <footer className={styles.pie}>
        <span>2 productos · Bs 77,00</span>
        <button type="button">Continuar por WhatsApp</button>
      </footer>
    </article>
  );
}
