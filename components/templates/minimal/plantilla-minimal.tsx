import Image from "next/image";

import { formatearPrecioBolivianos } from "../../../lib/precios";
import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import styles from "./plantilla-minimal.module.css";

export function PlantillaMinimal({ datos }: PropiedadesPlantilla) {
  return (
    <article className={styles.plantilla} aria-label="Vista previa de plantilla mínima">
      <header className={styles.cabecera}>
        <div>
          <h3>{datos.negocio.nombre}</h3>
          <p>{datos.negocio.descripcion}</p>
        </div>
        <address>
          Agenda o consulta
          <strong>{datos.negocio.telefonoWhatsapp}</strong>
        </address>
      </header>

      <div className={styles.servicios}>
        {datos.categorias.map((categoria) => (
          <section className={styles.categoria} key={categoria.id}>
            <h4>{categoria.nombre}</h4>
            <dl>
              {categoria.productos.map((producto) => (
                <div className={styles.servicio} key={producto.id}>
                  <Image
                    alt={producto.imagen.alt}
                    height={800}
                    sizes="64px"
                    src={producto.imagen.src}
                    width={800}
                  />
                  <dt>{producto.nombre}</dt>
                  <dd>{producto.descripcion}</dd>
                  <dd>{formatearPrecioBolivianos(producto.precio)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </article>
  );
}
