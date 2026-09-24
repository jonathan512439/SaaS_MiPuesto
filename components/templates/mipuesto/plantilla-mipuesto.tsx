"use client";

import Image from "next/image";
import { Fragment, useEffect, useState } from "react";

import { tieneAlgoEncima } from "../../../lib/negocios/texto-sobre-imagen";
import { iconosDePatron } from "../../../lib/patrones-fondo";
import { armarSecciones, posicionDelAnuncio } from "../../../lib/plantillas/secciones";
import type { PropiedadesPlantilla } from "../../../lib/plantillas/tipos";
import { Icono } from "../../iconos/icono";
import { IconoRed } from "../../iconos/redes";
import { IconoCatalogo } from "../../iconos/icono-catalogo";
import { AccionLlamar } from "../accion-llamar";
import { AvisoHorario } from "../aviso-horario";
import { BannerCatalogo } from "../banner-catalogo";
import { PatronCategorias } from "../patron-categorias";
import { TextoSobreImagen } from "../texto-sobre-imagen";
import temaStyles from "../tema-catalogo.module.css";
import { TarjetaMipuesto } from "./tarjeta-mipuesto";
import styles from "./plantilla-mipuesto.module.css";

/* El catálogo único, adaptado del diseño de `Catalogos_Ejemplo/`.
 *
 * Reemplaza a las cinco plantillas: hay un solo diseño, y lo que cambia entre
 * una veterinaria y una ferretería no es la estructura de la página, son sus
 * categorías, sus campos y sus acciones.
 *
 * Los bloques van en el orden del diseño de referencia. Cada bloque opcional
 * —portada, banner, esferas— **apagado no deja hueco**: no se dibuja, sin
 * margen fantasma. Lo que la maqueta traía inventado —calificaciones, reseñas,
 * pestañas de cuenta— no está: el sistema no muestra lo que no es cierto.
 */
export function PlantillaMipuesto({
  datos,
  paleta = "mercado",
  demostracion = true,
  cantidadesCarrito = {},
  alAgregarProducto,
  alAbrirWhatsapp,
  alVerProducto,
  navegacion,
  antesDelPie,
}: PropiedadesPlantilla) {
  const { negocio } = datos;
  const esferas = navegacion?.categorias ?? datos.categorias;

  /* El fondo se arma con los íconos de las categorías del negocio. Se toma de
     `esferas` —la lista completa— y no de la página: si no, el fondo cambiaría
     al filtrar por una categoría o al pasar de página.

     Vacío significa que este negocio no tiene categorías propias, y entonces el
     dibujo por rubro lo pone el contenedor con `data-patron`. Los dos nunca van
     juntos: quien pone el atributo consulta esta misma función. */
  const iconosPatron = negocio.patronFondo ? iconosDePatron(esferas) : [];

  /* Una vista previa no navega. Es la misma plantilla que el catálogo de verdad,
     y sin esta distinción tocar un producto de la portada sacaría al visitante
     del sitio hacia el catálogo de un negocio inventado. */
  const slugEnlazable = demostracion ? null : negocio.slug;

  /* Si la portada lleva su cartel. Lo decide el dueño escribiendo algo encima;
     sin nada, la portada es la foto sola. La cabecera lo pregunta también, para
     saber si la descripción tiene que ir ahí. */
  const portadaConTexto = Boolean(negocio.portadaUrl) && tieneAlgoEncima(negocio.portadaTexto);

  /* Las secciones, con sus subgrupos. Las reglas de cómo se reparten viven en
     `lib/plantillas/secciones.ts` y no acá: son reglas y no dibujo, están
     escritas una por una en el plan con el problema que evita cada una, y una
     regla que solo existe adentro de un componente no se puede comprobar sin
     dibujar la pantalla entera. */
  const seccionesConProductos = armarSecciones(datos.categorias);

  /* Después de cuál va el anuncio. La regla vive en `secciones.ts` con el
     motivo escrito: acá adentro no se podía comprobar sin dibujar la pantalla
     entera, y es justo la que se rompió. */
  const posicionAnuncio = posicionDelAnuncio(esferas.length);

  const irA = (id: string) => {
    if (typeof document === "undefined") return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* Elegir una categoría filtra y salta a los productos: sin el salto, en un
     teléfono el filtro pasa debajo del pliegue y parece que no hizo nada. En la
     vista previa del panel no hay navegación, así que solo hace el desplazamiento
     al ancla, que es el comportamiento de siempre. */
  const elegirEsfera = (categoriaId: string) => {
    navegacion?.alElegir(categoriaId);
    irA("productos");
  };

  /* El botón «volver arriba» aparece recién cuando hay algo arriba a lo que
     volver. Sin esto, en un catálogo corto sería un botón que no sirve. No se
     dibuja en la vista previa del panel, que no desplaza. */
  const [mostrarSubir, setMostrarSubir] = useState(false);
  useEffect(() => {
    if (demostracion) return;
    const alDesplazar = () => setMostrarSubir(window.scrollY > 600);
    alDesplazar();
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, [demostracion]);

  return (
    <article
      className={`${temaStyles.tema} ${styles.catalogo}`}
      /* La cabecera y la portada se pegan, así que la cabecera deja de curvar su
         borde de abajo: dos curvas enfrentadas dejan un ojal de fondo en el
         medio y se lee como un error de armado. Sin portada, la cabecera
         conserva su curva, que ahí sí tiene contra qué recortarse. */
      data-con-portada={negocio.portadaUrl ? "si" : undefined}
      data-paleta={paleta}
      aria-label={
        demostracion ? "Vista previa del catálogo" : `Catálogo de ${negocio.nombre}`
      }
    >
      <PatronCategorias iconos={iconosPatron} />

      {/* 1 · Cabecera pintada con la paleta: logo, nombre y —si publicó su
          ubicación— el botón para llegar. La descripción vive acá solo cuando no
          hay portada; con portada la lleva el hero, para no repetirla. */}
      <header className={styles.cabecera} id="inicio">
        <div className={styles.identidad}>
          {negocio.logoUrl ? (
            <Image
              alt={`Logo de ${negocio.nombre}`}
              className={styles.logo}
              height={56}
              src={negocio.logoUrl}
              width={56}
            />
          ) : (
            <span className={styles.logoVacio} aria-hidden="true">
              {negocio.nombre.slice(0, 1)}
            </span>
          )}
          <div className={styles.identidadTexto}>
            {/* El título de la página vive acá y no en el hero.
                Estaba en el hero, que solo existe si el negocio subió una
                portada: un catálogo sin portada no tenía título de página, y el
                que sí la tenía decía el nombre del negocio **dos veces** —en la
                cabecera y a cien píxeles debajo—, que en un teléfono es lo
                primero que se ve y lo único que se repite.
                La cabecera está siempre, así que es el único lugar donde el
                título está siempre. */}
            <h1>{negocio.nombre}</h1>
            {/* El subnombre es el renglón hecho para este lugar —«Pollos a la
                brasa», «Desde 1998»— así que gana cuando está. Sin él cae a la
                descripción, salvo que la portada lleve su propio cartel: ahí lo
                que el dueño escribió sobre la foto ya dice de qué se trata, y
                dos renglones de presentación a cien píxeles uno del otro se
                leen como una repetición. */}
            {negocio.subnombre ? (
              <p>{negocio.subnombre}</p>
            ) : negocio.descripcion && !portadaConTexto ? (
              <p>{negocio.descripcion}</p>
            ) : null}
          </div>
        </div>
        {/* Las dos cosas que se hacen con el negocio y no con sus productos:
            llegar hasta él y calificarlo. Van juntas en la cabecera y no
            enterradas en el pie.

            Calificar estaba **solo** en la pantalla de «pedido confirmado», o
            sea que un catálogo sin carrito nunca lo mostraba: el dueño llenaba
            el campo, con su instructivo y todo, y el enlace no aparecía en
            ninguna parte. Acá lo ve cualquiera, con carrito o sin él. */}
        <div className={styles.accionesNegocio}>
          {negocio.ubicacionUrl ? (
            <a
              className={styles.botonMapa}
              href={negocio.ubicacionUrl}
              rel="noreferrer noopener"
              target="_blank"
            >
              <Icono nombre="ubicacion" />
              <span>Cómo llegar</span>
            </a>
          ) : null}
          {negocio.resenasUrl ? (
            <a
              className={styles.botonMapa}
              href={negocio.resenasUrl}
              rel="noreferrer noopener"
              target="_blank"
            >
              <Icono nombre="mapa" />
              <span>Calificar</span>
            </a>
          ) : null}
        </div>
      </header>

      {/* 2 · Portada, con el cartel del dueño encima si escribió uno.
          Solo si el negocio subió una imagen; apagada no deja hueco.

          El cartel —antetítulo, título, bajada y botón— es el mismo que llevaba
          el banner de arriba, que ya no existe: iba a cien píxeles de la
          portada y eran dos franjas anchas con texto una sobre otra. Ahora la
          portada es el primer cartel del negocio, y lo que dice lo escribe el
          dueño desde «Apariencia». Sin texto, la foto va sola y **sin
          cortina**: el sombreado existe para que la letra se lea, no para
          decorar. */}
      {negocio.portadaUrl ? (
        <section className={styles.portada}>
          <Image
            alt={`Portada de ${negocio.nombre}`}
            className={styles.portadaImagen}
            fill
            sizes="(min-width: 60rem) 800px, 100vw"
            src={negocio.portadaUrl}
          />
          <TextoSobreImagen className={styles.hero} texto={negocio.portadaTexto} />
        </section>
      ) : null}

      {/* 3 y 4 · Buscador y esferas, pegados arriba al desplazar: son con lo que
          se navega, y en un catálogo largo tenerlos siempre a mano evita subir
          hasta arriba para cambiar de categoría. */}
      <div className={styles.barraFija}>
        {navegacion ? (
          <search className={styles.buscador}>
            <label className={styles.soloLectores} htmlFor="buscar-en-catalogo">
              Buscar en el catálogo
            </label>
            {/* La lupa va antes del campo y no adentro del texto: se ve sin leer,
                que es de lo que se trata. Decorativa a propósito —el rótulo de
                arriba ya dice qué es— para no anunciarla dos veces. */}
            <Icono nombre="lupa" />
            <input
              autoComplete="off"
              id="buscar-en-catalogo"
              onChange={(evento) => navegacion.alBuscar(evento.target.value)}
              placeholder={`Buscar en ${negocio.nombre}`}
              type="search"
              value={navegacion.busqueda}
            />
          </search>
        ) : null}

        {esferas.length > 0 ? (
          <nav aria-label="Categorías" className={styles.esferas} id="categorias">
            {navegacion ? (
              <button
                aria-pressed={navegacion.activa === ""}
                className={navegacion.activa === "" ? styles.esferaActiva : styles.esfera}
                onClick={() => elegirEsfera("")}
                type="button"
              >
                <span className={styles.esferaIcono} aria-hidden="true">
                  <IconoCatalogo nombre="tienda" />
                </span>
                <span className={styles.esferaNombre}>Todo</span>
              </button>
            ) : null}
            {esferas.map((categoria) => {
              const activa = navegacion?.activa === categoria.id;
              return (
                <button
                  aria-pressed={navegacion ? activa : undefined}
                  className={activa ? styles.esferaActiva : styles.esfera}
                  key={categoria.id}
                  onClick={() => elegirEsfera(categoria.id)}
                  type="button"
                >
                  <span className={styles.esferaIcono} aria-hidden="true">
                    <IconoCatalogo nombre={categoria.icono} />
                  </span>
                  <span className={styles.esferaNombre}>{categoria.nombre}</span>
                </button>
              );
            })}
          </nav>
        ) : null}
      </div>

      {/* 5 · Franja de horario. Se dibuja sola solo cuando hay algo que decir. */}
      <AvisoHorario estado={negocio.atencion} />

      {navegacion ? (
        <p aria-live="polite" className={styles.conteo}>
          {navegacion.totalProductos === 1
            ? "1 producto"
            : `${navegacion.totalProductos} productos`}
        </p>
      ) : null}

      {/* 6 · Productos, agrupados por categoría, con la tarjeta única.

          El banner de publicidad se intercala entre dos categorías: ahí lo ve
          quien ya está recorriendo el catálogo, que es a quien le sirve una
          promoción. Pegado al pie lo ve solo el que llegó hasta abajo, y pegado
          arriba compite con la portada. */}
      {/* La forma va en el contenedor además de en cada tarjeta: es la rejilla
          la que decide cuántas columnas hay, y eso depende de la forma. */}
      <div className={styles.secciones} data-forma={negocio.formaTarjeta} id="productos">
        {seccionesConProductos.map(({ categoria, sueltos, grupos, total }, posicion) => (
          <Fragment key={categoria.id}>
            {/* El ancla sigue siendo la de la categoría: es a donde saltan las
                esferas, y los subgrupos no se la pueden quedar. */}
            <section className={styles.seccion} id={`categoria-${categoria.id}`}>
              <div className={styles.seccionCabecera}>
                <h3 className={styles.seccionTitulo}>{categoria.nombre}</h3>
                <span className={styles.seccionCuenta}>
                  {total === 1 ? "1 producto" : `${total} productos`}
                </span>
              </div>

              {sueltos.length > 0 ? (
                <ul className={styles.rejilla}>
                  {sueltos.map((producto) => (
                    <TarjetaMipuesto
                      alAgregarProducto={alAgregarProducto}
                      alAbrirWhatsapp={alAbrirWhatsapp}
                      alVerProducto={alVerProducto}
                      cantidadEnCarrito={cantidadesCarrito[producto.id]}
                      demostracion={demostracion}
                      forma={negocio.formaTarjeta}
                      iconoCategoria={categoria.icono}
                      key={producto.id}
                      modalidad={negocio.modalidad}
                      permiteAcciones={negocio.atencion.permiteAcciones}
                      producto={producto}
                      slug={slugEnlazable}
                    />
                  ))}
                </ul>
              ) : null}

              {grupos.map((grupo) => (
                <div className={styles.subgrupo} key={grupo.nombre}>
                  <h4 className={styles.subgrupoTitulo}>{grupo.nombre}</h4>
                  <ul className={styles.rejilla}>
                    {grupo.productos.map((producto) => (
                      <TarjetaMipuesto
                        alAgregarProducto={alAgregarProducto}
                        alAbrirWhatsapp={alAbrirWhatsapp}
                        alVerProducto={alVerProducto}
                        cantidadEnCarrito={cantidadesCarrito[producto.id]}
                        demostracion={demostracion}
                        forma={negocio.formaTarjeta}
                        iconoCategoria={categoria.icono}
                        key={producto.id}
                        modalidad={negocio.modalidad}
                        permiteAcciones={negocio.atencion.permiteAcciones}
                        producto={producto}
                        slug={slugEnlazable}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            {posicion === posicionAnuncio ? (
              <BannerCatalogo banner={negocio.banners[0]} className={styles.anuncio} />
            ) : null}
          </Fragment>
        ))}
      </div>

      {/* 7 · Pie: cómo contactar y cómo llegar. */}
      {/* Lo que va pegado al final de los productos y antes del pie: el
          paginador, y el aviso de que una búsqueda no encontró nada.
          Llega desde afuera porque quien sabe cuántas páginas hay es el catálogo
          interactivo, no la plantilla. Y entra acá y no después de la plantilla
          —que es donde estaba— porque después de la plantilla es **después del
          pie**: el paginador quedaba debajo de las redes del negocio y del
          enlace de MiPuesto, o sea al final de todo, donde nadie lo busca. */}
      {antesDelPie}

      {/* Las dos invitaciones del final: ir hasta el negocio y calificarlo.
          Los botones de la cabecera son atajos para quien ya entró decidido;
          esto es otra cosa. Llegan **después** de recorrer el catálogo, que es
          cuando la persona ya se formó una opinión y ya sabe si le interesa
          acercarse. Pedir una calificación al llegar es pedirla antes de que
          haya pasado nada.
          Y son preguntas y no rótulos: una pregunta se contesta, aunque sea
          mentalmente, y ese medio segundo es el que gana el toque. Un botón
          solo, por grande que sea, se lee como un cartel más. */}
      {negocio.ubicacionUrl || negocio.resenasUrl ? (
        <div className={styles.invitaciones}>
          {negocio.ubicacionUrl ? (
            <section aria-labelledby="invitacion-llegar" className={styles.invitacion}>
              <Icono nombre="ubicacion" />
              <h3 id="invitacion-llegar">¿Vienes a vernos?</h3>
              <a href={negocio.ubicacionUrl} rel="noreferrer noopener" target="_blank">
                Cómo llegar
              </a>
            </section>
          ) : null}
          {negocio.resenasUrl ? (
            <section aria-labelledby="invitacion-calificar" className={styles.invitacion}>
              <Icono nombre="mapa" />
              <h3 id="invitacion-calificar">¿Te atendieron bien?</h3>
              <a href={negocio.resenasUrl} rel="noreferrer noopener" target="_blank">
                Calificar en Google
              </a>
            </section>
          ) : null}
        </div>
      ) : null}

      <footer className={styles.pie}>
        <strong>WhatsApp {negocio.telefonoWhatsapp}</strong>
        {/* Sin «Cómo llegar»: ya está en la cabecera y en la invitación de acá
            arriba. El mismo enlace tres veces en una pantalla deja de leerse
            como una ayuda y empieza a leerse como relleno. */}
        <div className={styles.pieAcciones}>
          <AccionLlamar className={styles.pieEnlace} telefono={negocio.telefonoWhatsapp} />
        </div>
        {negocio.redesSociales.length ? (
          /* Con el dibujo arriba y el nombre debajo.
             Eran tres palabras subrayadas en fila, que a la altura del pie —donde
             ya hay enlaces legales y el de MiPuesto— se perdían entre el resto.
             La silueta se reconoce antes de leerse, y el nombre queda para
             confirmar. Se mantiene el nombre y no se deja el dibujo solo: una
             silueta simplificada se reconoce, pero no se lee en voz alta. */
          <nav aria-label="Enlaces del negocio" className={styles.redes}>
            {negocio.redesSociales.map((red) => (
              <a href={red.url} key={red.nombre} rel="noreferrer" target="_blank">
                <IconoRed className={styles.iconoRed} nombre={red.nombre} />
                <span>{red.nombre}</span>
              </a>
            ))}
          </nav>
        ) : null}
      </footer>

      {/* Volver arriba: aparece al desplazar, y queda por encima de la barra
          inferior fija para no taparse con ella. */}
      {mostrarSubir ? (
        <button
          aria-label="Volver arriba"
          className={styles.subir}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          type="button"
        >
          <Icono nombre="flechaArriba" />
        </button>
      ) : null}
    </article>
  );
}
