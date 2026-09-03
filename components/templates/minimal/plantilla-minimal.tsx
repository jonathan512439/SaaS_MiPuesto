import Image from "next/image";

import { formatearPrecioBolivianos } from "../../../lib/precios";
import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import { AccionProducto } from "../accion-producto";
import { AvisoHorario } from "../aviso-horario";
import { EstadoStockProducto } from "../estado-stock-producto";
import temaStyles from "../tema-catalogo.module.css";
import styles from "./plantilla-minimal.module.css";

export function PlantillaMinimal({
  datos,
  paleta = "mercado",
  demostracion = true,
  cantidadesCarrito = {},
  alAgregarProducto,
  ocultarNavegacionCategorias = false,
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
          {datos.negocio.atencion.texto ? <span>{datos.negocio.atencion.texto}</span> : null}
          <small>WhatsApp {datos.negocio.telefonoWhatsapp}</small>
        </div>
      </header>

      <AvisoHorario estado={datos.negocio.atencion} />

      {!ocultarNavegacionCategorias ? (
        <nav className={styles.navegacion} aria-label="Secciones del catálogo">
          {datos.categorias.map((categoria) => (
            <a href={`#${categoria.id}`} key={categoria.id}>{categoria.nombre}</a>
          ))}
        </nav>
      ) : null}

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
                  {producto.controlaStock ? (
                    <dd><EstadoStockProducto className={styles.stock} producto={producto} /></dd>
                  ) : null}
                  {datos.negocio.modalidad !== "solo_lectura" ? (
                    <dd>
                      <AccionProducto
                        alAgregarProducto={alAgregarProducto}
                        cantidad={cantidadesCarrito[producto.id]}
                        demostracion={demostracion}
                        modalidad={datos.negocio.modalidad}
                        permiteAcciones={datos.negocio.atencion.permiteAcciones}
                        producto={producto}
                      />
                    </dd>
                  ) : null}
                </div>
              ))}
            </dl>
          </section>;
        })}
      </div>

      <footer className={styles.pie}>
        <p>Cuéntanos qué necesitas y te orientamos personalmente.</p>
        {demostracion && datos.negocio.modalidad === "carrito" ? (
          <button type="button">Revisar mi pedido</button>
        ) : null}
      </footer>
    </article>
  );
}
