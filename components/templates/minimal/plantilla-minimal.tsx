import Image from "next/image";

import { formatearPrecioBolivianos } from "../../../lib/precios";
import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import temaStyles from "../tema-catalogo.module.css";
import styles from "./plantilla-minimal.module.css";

export function PlantillaMinimal({
  datos,
  paleta = "mercado",
  demostracion = true,
}: PropiedadesPlantilla) {
  return (
    <article
      className={`${temaStyles.tema} ${styles.plantilla}`}
      data-paleta={paleta}
      aria-label={demostracion ? "Vista previa de plantilla mínima" : `Catálogo de ${datos.negocio.nombre}`}
    >
      <header className={styles.cabecera}>
        <div>
          <p className={styles.etiqueta}>Atención personalizada</p>
          <h3>{datos.negocio.nombre}</h3>
          <p>{datos.negocio.descripcion}</p>
        </div>
        <div className={styles.contacto}>
          <span>{datos.negocio.horarioTexto}</span>
          {demostracion ? <button type="button">Consultar disponibilidad</button> : null}
          <small>WhatsApp {datos.negocio.telefonoWhatsapp}</small>
        </div>
      </header>

      <nav className={styles.navegacion} aria-label="Secciones de la demostración">
        {datos.categorias.map((categoria) => (
          <a href={`#${categoria.id}`} key={categoria.id}>{categoria.nombre}</a>
        ))}
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
                  <dd>{formatearPrecioBolivianos(producto.precio)}</dd>
                  {producto.estado === "agotado" ? <dd><span className={styles.agotado}>Agotado</span></dd> : null}
                  {demostracion ? <dd><button type="button">Elegir</button></dd> : null}
                </div>
              ))}
            </dl>
          </section>;
        })}
      </div>

      <footer className={styles.pie}>
        <p>Cuéntanos qué necesitas y te orientamos personalmente.</p>
        {demostracion ? <button type="button">Iniciar una consulta</button> : null}
      </footer>
    </article>
  );
}
