import Image from "next/image";

import { formatearPrecioBolivianos } from "../../../lib/precios";
import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import styles from "./plantilla-moderna.module.css";

export function PlantillaModerna({ datos }: PropiedadesPlantilla) {
  const productos = datos.categorias.flatMap((categoria) =>
    categoria.productos.map((producto) => ({ ...producto, categoria: categoria.nombre })),
  );

  return (
    <article className={styles.plantilla} aria-label="Vista previa de plantilla moderna">
      <header className={styles.portada}>
        <div>
          <p>Vitrina digital</p>
          <h3>{datos.negocio.nombre}</h3>
        </div>
        <p>{datos.negocio.descripcion}</p>
      </header>

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
              <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
            </div>
          </li>
        ))}
      </ul>

      <footer>Escríbenos al {datos.negocio.telefonoWhatsapp}</footer>
    </article>
  );
}
