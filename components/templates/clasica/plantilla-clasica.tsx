import Image from "next/image";

import { formatearPrecioBolivianos } from "../../../lib/precios";
import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import temaStyles from "../tema-catalogo.module.css";
import styles from "./plantilla-clasica.module.css";

export function PlantillaClasica({
  datos,
  paleta = "mercado",
  demostracion = true,
}: PropiedadesPlantilla) {
  return (
    <article
      className={`${temaStyles.tema} ${styles.plantilla}`}
      data-paleta={paleta}
      aria-label={demostracion ? "Vista previa de plantilla clásica" : `Catálogo de ${datos.negocio.nombre}`}
    >
      <header className={styles.cabecera}>
        <p className={styles.sello}>Carta del negocio</p>
        <h3>{datos.negocio.nombre}</h3>
        <p>{datos.negocio.descripcion}</p>
        <span className={styles.horario}>{datos.negocio.horarioTexto}</span>
      </header>

      <nav className={styles.navegacion} aria-label="Categorías del catálogo">
        {datos.categorias.map((categoria) => (
          demostracion ? (
            <button type="button" key={categoria.id}>{categoria.nombre}</button>
          ) : (
            <a href={`#categoria-${categoria.id}`} key={categoria.id}>{categoria.nombre}</a>
          )
        ))}
      </nav>

      <div className={styles.categorias}>
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
          return <section className={styles.categoria} id={`categoria-${categoria.id}`} key={categoria.id}>
            <div className={styles.tituloCategoria}>
              <span aria-hidden="true">◆</span>
              <h4>{categoria.nombre}</h4>
              <span aria-hidden="true">◆</span>
            </div>
            <ul>
              {productos.map((producto) => (
                <li className={styles.producto} key={producto.id}>
                  {producto.imagen ? (
                    <Image
                      alt={producto.imagen.alt}
                      height={800}
                      sizes="64px"
                      src={producto.imagen.src}
                      width={800}
                    />
                  ) : <span className={styles.sinImagen}>Sin foto</span>}
                  <div>
                    {producto.subcategoria ? <span className={styles.subcategoria}>{producto.subcategoria}</span> : null}
                    <h5>{producto.nombre}</h5>
                    <p>{producto.descripcion}</p>
                    {producto.estado === "agotado" ? <span className={styles.agotado}>Agotado</span> : null}
                    {demostracion ? <button type="button">Añadir al pedido</button> : null}
                  </div>
                  <strong>{formatearPrecioBolivianos(producto.precio)}</strong>
                </li>
              ))}
            </ul>
          </section>;
        })}
      </div>

      <footer className={styles.pie}>
        <p>¿Necesitas ayuda para elegir?</p>
        <strong>WhatsApp {datos.negocio.telefonoWhatsapp}</strong>
        {demostracion ? <button type="button">Ver mi pedido · 2 productos</button> : null}
      </footer>
    </article>
  );
}
