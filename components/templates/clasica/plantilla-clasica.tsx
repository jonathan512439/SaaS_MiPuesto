import Image from "next/image";

import { formatearPrecioBolivianos } from "../../../lib/precios";
import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import styles from "./plantilla-clasica.module.css";

export function PlantillaClasica({ datos }: PropiedadesPlantilla) {
  return (
    <article className={styles.plantilla} aria-label="Vista previa de plantilla clásica">
      <header className={styles.cabecera}>
        <p>Carta del negocio</p>
        <h3>{datos.negocio.nombre}</h3>
        <p>{datos.negocio.descripcion}</p>
      </header>

      <div className={styles.categorias}>
        {datos.categorias.map((categoria) => (
          <section className={styles.categoria} key={categoria.id}>
            <h4>{categoria.nombre}</h4>
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
                  </div>
                  <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <footer>Consultas: {datos.negocio.telefonoWhatsapp}</footer>
    </article>
  );
}
