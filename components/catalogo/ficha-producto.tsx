"use client";

import Image from "next/image";
import { useState } from "react";

import { formatearPrecioBolivianos } from "../../lib/precios";
import type { ProductoPlantilla } from "../../lib/plantillas/tipos";
import { AccionProducto } from "../templates/accion-producto";
import { EstadoStockProducto } from "../templates/estado-stock-producto";
import { SelectorDeTurno } from "./selector-de-turno";
import styles from "./ficha-producto.module.css";

/* La ficha de un producto: fotografías, precio, presentaciones, datos y acción.
 *
 * Es el cuerpo de la página del producto. Hasta hace poco tocar una tarjeta
 * abría una hoja encima del catálogo, y esta ficha se dibujaba adentro de esa
 * hoja **y** en la página; el dueño pidió que fuera una página de verdad, como
 * en los catálogos de referencia, y la hoja se retiró.
 *
 * Con eso se ganaron tres cosas que una ventana encima no puede dar: la
 * dirección se copia y se manda por WhatsApp, el botón «atrás» del teléfono
 * vuelve al catálogo, y el buscador encuentra el producto.
 *
 * Sigue suelta del archivo de la página porque es cliente —galería, presentación
 * elegida, agregar al pedido— y la página es servidor: lo que se separa acá es
 * lo que se dibuja de nuevo al tocar algo. */
export function FichaProducto({
  producto,
  modalidad,
  permiteAcciones,
  slug,
  cantidad = 0,
  alAgregarProducto,
  alAbrirWhatsapp,
}: {
  producto: ProductoPlantilla;
  modalidad: "solo_lectura" | "accion_individual" | "carrito";
  permiteAcciones: boolean;
  slug: string;
  cantidad?: number;
  alAgregarProducto?: (productoId: string) => void;
  alAbrirWhatsapp?: (productoId: string | null) => void;
}) {
  const [actual, setActual] = useState(0);
  /* Ninguna elegida al abrir, y no la primera. Preseleccionar una talla haría
     que quien no mira el selector pida la S sin saberlo. */
  const [varianteElegida, setVarianteElegida] = useState<string | null>(null);
  const [productoAnterior, setProductoAnterior] = useState(producto.id);

  /* Cada producto empieza por su primera fotografía: quien abre otro espera ver
     la suya, no la última que dejó en el anterior. Se ajusta durante el dibujo
     para no pintar una vez con la imagen equivocada. */
  if (producto.id !== productoAnterior) {
    setProductoAnterior(producto.id);
    setActual(0);
    setVarianteElegida(null);
  }

  /* El precio que se muestra: el de la presentación elegida, o el del producto
     mientras no haya ninguna. Se calcula acá y no en el JSX para que el botón de
     WhatsApp y el número de arriba no puedan decir cosas distintas. */
  const variante = producto.variantes.find(({ id }) => id === varianteElegida) ?? null;
  const precioMostrado = variante ? variante.precio : producto.precio;

  const imagenes = producto.imagenes;
  const total = imagenes.length;
  const mover = (paso: number) => setActual((indice) => (indice + paso + total) % total);
  const imagen = total > 0 ? imagenes[Math.min(actual, total - 1)] : null;

  return (
    <>
      {/* Las fotografías, juntas en un bloque: en el teléfono van una debajo de
          otra igual que antes, y en una pantalla ancha son la columna izquierda
          de la página, con el detalle al lado. */}
      <div className={styles.galeria}>
      {/* `contain` y no `cover`: acá se viene a ver la fotografía entera, que es
          justo lo que la miniatura de la tarjeta corta. */}
      <div className={styles.lienzo}>
        {imagen ? (
          <Image
            alt={imagen.alt}
            className={styles.imagen}
            height={1200}
            sizes="(min-width: 48rem) 40rem, 100vw"
            src={imagen.src}
            width={1200}
          />
        ) : (
          <p className={styles.sinFoto}>Este producto todavía no tiene fotografías.</p>
        )}
        {total > 1 ? (
          <>
            <button
              aria-label="Fotografía anterior"
              className={`${styles.paso} ${styles.anterior}`}
              onClick={() => mover(-1)}
              type="button"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              aria-label="Fotografía siguiente"
              className={`${styles.paso} ${styles.siguiente}`}
              onClick={() => mover(1)}
              type="button"
            >
              <span aria-hidden="true">›</span>
            </button>
            <p aria-live="polite" className={styles.conteo}>
              {actual + 1} de {total}
            </p>
          </>
        ) : null}
      </div>

      {total > 1 ? (
        <div className={styles.miniaturas}>
          {imagenes.map((foto, indice) => (
            <button
              aria-current={indice === actual}
              aria-label={`Ver la fotografía ${indice + 1}`}
              className={indice === actual ? styles.miniaturaActiva : styles.miniatura}
              key={foto.src}
              onClick={() => setActual(indice)}
              type="button"
            >
              <Image alt="" height={96} sizes="64px" src={foto.src} width={96} />
            </button>
          ))}
        </div>
      ) : null}
      </div>

      <div className={styles.detalle}>
        {/* `h1` porque esta ficha es la página del producto, y la página es del
            producto: su nombre es el título de todo lo que hay en pantalla. */}
        <h1 className={styles.titulo}>{producto.nombre}</h1>

        <div className={styles.precio}>
          {producto.tienePromocion ? (
            <s>{formatearPrecioBolivianos(producto.precioOriginal)}</s>
          ) : null}
          {/* El precio sigue a la presentación elegida: si «7,5 kg» cuesta otra
              cosa, el número de arriba tiene que decirlo antes de que la persona
              toque el botón, no después. */}
          <strong>{formatearPrecioBolivianos(precioMostrado)}</strong>
          {producto.tienePromocion ? <small>Precio promocional</small> : null}
        </div>

        {producto.variantes.length > 0 ? (
          <fieldset className={styles.variantes}>
            <legend>Presentación</legend>
            {producto.variantes.map((opcion) => (
              <label key={opcion.id}>
                <input
                  checked={varianteElegida === opcion.id}
                  name="presentacion"
                  onChange={() => setVarianteElegida(opcion.id)}
                  type="radio"
                  value={opcion.id}
                />
                <span>{opcion.nombre}</span>
                {opcion.precio !== producto.precio ? (
                  <small>{formatearPrecioBolivianos(opcion.precio)}</small>
                ) : null}
              </label>
            ))}
          </fieldset>
        ) : null}

        <div className={styles.estados}>
          {producto.estado === "agotado" ? (
            <span className={styles.agotado}>Agotado</span>
          ) : null}
          <EstadoStockProducto className={styles.stock} producto={producto} />
        </div>

        {producto.descripcion ? (
          <p className={styles.descripcion}>{producto.descripcion}</p>
        ) : null}

        {/* Los campos propios de la categoría, en una tabla de dos columnas.
            Acá sí van los nombres —a diferencia de la línea de la tarjeta—
            porque este es el lugar adonde se viene a mirar el detalle, y «E27»
            sin decir «Casquillo» no le sirve a quien no conoce el rubro.

            Alineados en columna y con una línea entre filas: es la forma en que
            se leen las fichas técnicas en cualquier tienda, y con los nombres
            uno debajo del otro la vista los recorre de una. Sueltos, cada par
            arrancaba en un lugar distinto y el bloque se leía como notas.

            Sigue siendo una lista de definiciones y no una `<table>`: son pares
            nombre-valor, no una grilla de datos, y el lector de pantalla los
            anuncia mejor así. La tabla es cómo se ve, no qué es. */}
        {producto.especificaciones.length > 0 ? (
          <section className={styles.fichaTecnica}>
            <h2 className={styles.fichaTecnicaTitulo}>Detalles</h2>
            <dl className={styles.especificaciones}>
              {producto.especificaciones.map((dato) => (
                <div key={dato.clave}>
                  <dt>{dato.nombre}</dt>
                  <dd>{dato.texto}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {/* Vender tiempo y vender cosas son dos formas de comprar distintas: una
            pide cantidad y la otra pide día y hora. Se dibuja una o la otra, no
            las dos, porque «2 unidades de consulta a las 10:00» no significa
            nada.

            Un catálogo de solo mostrar **no reserva**: esa modalidad existe para
            el negocio que publica lo que tiene y atiende por su cuenta. */}
        {producto.vendeTiempo && modalidad !== "solo_lectura" ? (
          <SelectorDeTurno
            productoId={producto.id}
            productoNombre={producto.nombre}
            slug={slug}
          />
        ) : producto.vendeTiempo ? (
          <p className={styles.soloMuestra}>Consultá al negocio para agendar.</p>
        ) : (
          <div className={styles.accion}>
            <AccionProducto
              alAgregarProducto={alAgregarProducto}
              alAbrirWhatsapp={alAbrirWhatsapp}
              cantidad={cantidad}
              demostracion={false}
              modalidad={modalidad}
              permiteAcciones={permiteAcciones}
              /* Con una presentación elegida, la acción es la suya: su precio y
                 su nombre. Sin ninguna, la del producto. Se reemplazan los dos
                 campos juntos para que el botón no pueda quedar con el precio de
                 una y el mensaje de otra. */
              producto={
                variante
                  ? { ...producto, precio: variante.precio, accionWhatsapp: variante.accionWhatsapp }
                  : producto
              }
            />
          </div>
        )}
      </div>
    </>
  );
}
