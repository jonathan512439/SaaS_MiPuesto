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
        {productos.map((producto, indice) => (
          <li className={styles.producto} key={producto.id}>
            <div className={styles.imagen} aria-hidden="true">
              <span>{indice + 1}</span>
            </div>
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
