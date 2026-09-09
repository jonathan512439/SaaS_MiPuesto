import { IBM_Plex_Sans } from "next/font/google";
import Image from "next/image";

import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import { AccionLlamar } from "../accion-llamar";
import { AvisoHorario } from "../aviso-horario";
import { BannerCatalogo } from "../banner-catalogo";
import { TarjetaProducto } from "../tarjetas";
import temaStyles from "../tema-catalogo.module.css";
import styles from "./plantilla-catalogo.module.css";

/* Una grotesca de origen técnico, con números de ancho fijo.
 *
 * Acá se leen medidas y códigos —«1/2"», «E27», «PRD-8F3A»— y en una fuente
 * proporcional los dígitos bailan de fila en fila, que es exactamente lo que
 * estorba cuando se compara una columna de números. */
const fuente = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--fuente-catalogo",
});

/* El catálogo técnico: se busca antes de mirar.
 *
 * Las demás plantillas presentan el negocio y después ofrecen sus productos.
 * Esta invierte el orden porque en ferretería, repuestos o electropartes la
 * primera pregunta del comprador no es «¿qué tenés?» sino **«¿tenés esto?»**, y
 * quien llega con esa pregunta ya sabe qué quiere. Hacerlo bajar tres pantallas
 * hasta el buscador es hacerlo irse.
 *
 * Eso no se resuelve con estilos, y por eso es una plantilla y no una paleta: el
 * buscador va arriba de todo, la portada se reduce a una franja de identidad, y
 * las categorías son un filtro y no un recorrido.
 *
 * Su tarjeta predeterminada es `ficha`, la fila compacta que en la fase 2 va a
 * recibir los dos atributos destacados. Hasta entonces se ve como la de Feria,
 * que es de donde sale.
 */
export function PlantillaCatalogo({
  datos,
  paleta = "mercado",
  demostracion = true,
  cantidadesCarrito = {},
  alAgregarProducto,
  alAbrirWhatsapp,
  alVerProducto,
  navegacion,
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
      className={`${fuente.variable} ${temaStyles.tema} ${styles.plantilla}`}
      data-paleta={paleta}
      aria-label={
        demostracion ? "Vista previa de plantilla catálogo" : `Catálogo de ${datos.negocio.nombre}`
      }
    >
      {/* La identidad ocupa una franja, no una portada. Quien busca un repuesto
          no necesita ver el frente del local a pantalla completa. */}
      <header className={styles.identidad}>
        {datos.negocio.logoUrl ? (
          <Image
            alt={`Logo de ${datos.negocio.nombre}`}
            className={styles.logo}
            height={48}
            src={datos.negocio.logoUrl}
            width={48}
          />
        ) : null}
        <div className={styles.nombreNegocio}>
          <strong>{datos.negocio.nombre}</strong>
          <span>{datos.negocio.descripcion}</span>
        </div>
        {datos.negocio.atencion.texto && !datos.negocio.atencion.aviso ? (
          <span className={styles.atencion}>{datos.negocio.atencion.texto}</span>
        ) : null}
      </header>

      <AvisoHorario estado={datos.negocio.atencion} />

      <BannerCatalogo banner={datos.negocio.banners[0]} />

      {/* Lo primero que se toca. En demostración no hay navegación conectada, así
          que se dibuja igual pero inerte: esconderlo mostraría una plantilla que
          no se parece a la que el dueño va a tener. */}
      <search className={styles.buscador}>
        <label className={styles.etiquetaBusqueda} htmlFor="buscar-en-catalogo">
          Buscar en el catálogo
        </label>
        <input
          autoComplete="off"
          id="buscar-en-catalogo"
          onChange={(evento) => navegacion?.alBuscar(evento.target.value)}
          placeholder="Nombre, medida o código"
          readOnly={!navegacion}
          type="search"
          value={navegacion?.busqueda ?? ""}
        />
      </search>

      <nav className={styles.filtros} aria-label="Categorías del catálogo">
        {navegacion ? (
          <button
            aria-pressed={navegacion.activa === ""}
            className={navegacion.activa === "" ? styles.categoriaActiva : undefined}
            onClick={() => navegacion.alElegir("")}
            type="button"
          >
            Todo
          </button>
        ) : null}
        {(navegacion?.categorias ?? datos.categorias).map((categoria, indice) => {
          const activa = navegacion ? navegacion.activa === categoria.id : indice === 0;
          return (
            <button
              aria-pressed={navegacion ? activa : undefined}
              className={activa ? styles.categoriaActiva : undefined}
              key={categoria.id}
              onClick={() => navegacion?.alElegir(categoria.id)}
              type="button"
            >
              {categoria.nombre}
            </button>
          );
        })}
      </nav>

      {navegacion ? (
        <p aria-live="polite" className={styles.conteo}>
          {navegacion.totalProductos === 1
            ? "1 resultado"
            : `${navegacion.totalProductos} resultados`}
        </p>
      ) : null}

      <ul className={styles.productos}>
        {productos.map((producto) => (
          <TarjetaProducto
            alAgregarProducto={alAgregarProducto}
            alAbrirWhatsapp={alAbrirWhatsapp}
            alVerProducto={alVerProducto}
            cantidadEnCarrito={cantidadesCarrito[producto.id]}
            demostracion={demostracion}
            key={producto.id}
            modalidad={datos.negocio.modalidad}
            permiteAcciones={datos.negocio.atencion.permiteAcciones}
            producto={producto}
            tarjeta={datos.negocio.tarjeta}
          />
        ))}
      </ul>

      <BannerCatalogo banner={datos.negocio.banners[1]} />

      <footer className={styles.pie}>
        <span>WhatsApp {datos.negocio.telefonoWhatsapp}</span>
        {/* Llamar antes que la dirección: quien busca un repuesto quiere
            preguntar si lo tienen, no ir a verlo. */}
        <AccionLlamar className={styles.enlacePie} telefono={datos.negocio.telefonoWhatsapp} />
        {datos.negocio.ubicacionUrl ? (
          <a
            className={styles.enlacePie}
            href={datos.negocio.ubicacionUrl}
            rel="noreferrer"
            target="_blank"
          >
            Cómo llegar
          </a>
        ) : null}
        {datos.negocio.redesSociales.length ? (
          <nav aria-label="Enlaces del negocio" className={styles.redes}>
            {datos.negocio.redesSociales.map((red) => (
              <a href={red.url} key={red.nombre} rel="noreferrer" target="_blank">
                {red.nombre}
              </a>
            ))}
          </nav>
        ) : null}
      </footer>
    </article>
  );
}
