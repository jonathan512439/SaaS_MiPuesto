import Image from "next/image";

import { formatearPrecioBolivianos } from "../../../lib/precios";
import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import temaStyles from "../tema-catalogo.module.css";
import styles from "./plantilla-clasica.module.css";

export function PlantillaClasica({ datos, paleta = "mercado" }: PropiedadesPlantilla) {
  return (
    <article
      className={`${temaStyles.tema} ${styles.plantilla}`}
      data-paleta={paleta}
      aria-label="Vista previa de plantilla clásica"
    >
      <header className={styles.cabecera}>
        <p className={styles.sello}>Carta del negocio</p>
        <h3>{datos.negocio.nombre}</h3>
        <p>{datos.negocio.descripcion}</p>
        <span className={styles.horario}>{datos.negocio.horarioTexto}</span>
      </header>

      <nav className={styles.navegacion} aria-label="Categorías de la demostración">
        {datos.categorias.map((categoria) => (
          <button type="button" key={categoria.id}>{categoria.nombre}</button>
        ))}
      </nav>

      <div className={styles.categorias}>
        {datos.categorias.map((categoria) => (
          <section className={styles.categoria} key={categoria.id}>
            <div className={styles.tituloCategoria}>
              <span aria-hidden="true">◆</span>
              <h4>{categoria.nombre}</h4>
              <span aria-hidden="true">◆</span>
            </div>
            <ul>
              {categoria.productos.map((producto) => (
                <li className={styles.producto} key={producto.id}>
                  <Image
                    alt={producto.imagen.alt}
                    height={800}
                    sizes="64px"
                    src={producto.imagen.src}
                    width={800}
                  />
                  <div>
                    <h5>{producto.nombre}</h5>
                    <p>{producto.descripcion}</p>
                    <button type="button">Añadir al pedido</button>
                  </div>
                  <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <footer className={styles.pie}>
        <p>¿Necesitas ayuda para elegir?</p>
        <strong>WhatsApp {datos.negocio.telefonoWhatsapp}</strong>
        <button type="button">Ver mi pedido · 2 productos</button>
      </footer>
    </article>
  );
}
