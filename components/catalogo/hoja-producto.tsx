"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import type { PaletaId } from "../../lib/apariencia";
import type { ModoAccionCatalogo } from "../../lib/modalidades";
import { formatearPrecioBolivianos } from "../../lib/precios";
import type { ProductoPlantilla } from "../../lib/plantillas/tipos";
import { AccionProducto } from "../templates/accion-producto";
import { EstadoStockProducto } from "../templates/estado-stock-producto";
import temaStyles from "../templates/tema-catalogo.module.css";
import styles from "./hoja-producto.module.css";

type PropiedadesHojaProducto = {
  producto: ProductoPlantilla | null;
  paleta: PaletaId;
  modalidad: ModoAccionCatalogo;
  permiteAcciones: boolean;
  cantidad: number;
  onCerrar: () => void;
  alAgregarProducto: (productoId: string) => void;
  alAbrirWhatsapp: (productoId: string | null) => void;
};

/* La ficha se abre desde la tarjeta y manda la fotografía: es lo que la
   miniatura recorta y lo que decide una compra. Debajo va lo que la tarjeta ya
   resume —precio, descripción, existencias— y la misma acción de siempre, que
   en un catálogo de solo lectura no dibuja nada por su cuenta. */
export function HojaProducto({
  producto,
  paleta,
  modalidad,
  permiteAcciones,
  cantidad,
  onCerrar,
  alAgregarProducto,
  alAbrirWhatsapp,
}: PropiedadesHojaProducto) {
  const referencia = useRef<HTMLDialogElement>(null);
  const [actual, setActual] = useState(0);
  /* Ninguna elegida al abrir, y no la primera. Preseleccionar una talla haría
     que quien no mira el selector pida la S sin saberlo. */
  const [varianteElegida, setVarianteElegida] = useState<string | null>(null);
  const [productoAnterior, setProductoAnterior] = useState(producto?.id ?? null);
  const idTitulo = useId();
  const abierta = producto !== null;

  /* Cada apertura empieza por la primera fotografía: quien abre otro producto
     espera ver la suya, no la última que dejó en el anterior. Se ajusta durante
     el render para no dibujar una vez con la imagen equivocada. */
  if ((producto?.id ?? null) !== productoAnterior) {
    setProductoAnterior(producto?.id ?? null);
    setActual(0);
    setVarianteElegida(null);
  }

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;
    if (abierta && !dialogo.open) dialogo.showModal();
    if (!abierta && dialogo.open) dialogo.close();
  }, [abierta]);

  useEffect(() => {
    if (!abierta) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [abierta]);

  if (!producto) return null;

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
    <dialog
      aria-labelledby={idTitulo}
      className={`${temaStyles.tema} ${styles.hoja}`}
      data-paleta={paleta}
      onCancel={(evento) => {
        evento.preventDefault();
        onCerrar();
      }}
      onClick={(evento) => {
        if (evento.target === referencia.current) onCerrar();
      }}
      onKeyDown={(evento) => {
        if (total < 2) return;
        if (evento.key === "ArrowRight") mover(1);
        if (evento.key === "ArrowLeft") mover(-1);
      }}
      ref={referencia}
    >
      <button
        aria-label="Cerrar la ficha del producto"
        className={styles.cerrar}
        onClick={onCerrar}
        type="button"
      >
        <span aria-hidden="true">×</span>
      </button>

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

      <div className={styles.detalle}>
        <h2 className={styles.titulo} id={idTitulo}>
          {producto.nombre}
        </h2>

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
            {producto.variantes.map((variante) => (
              <label key={variante.id}>
                <input
                  checked={varianteElegida === variante.id}
                  name="presentacion"
                  onChange={() => setVarianteElegida(variante.id)}
                  type="radio"
                  value={variante.id}
                />
                <span>{variante.nombre}</span>
                {variante.precio !== producto.precio ? (
                  <small>{formatearPrecioBolivianos(variante.precio)}</small>
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

        {/* Las especificaciones, con su nombre al lado. Acá sí van los nombres
            —a diferencia de la línea de la tarjeta— porque este es el lugar
            adonde se viene a mirar el detalle, y «E27» sin decir «Casquillo» no
            le sirve a quien no conoce el rubro.

            Se dibuja con `dl` y no con una tabla: es una lista de pares nombre y
            valor, que es exactamente lo que `dl` describe. */}
        {producto.especificaciones.length > 0 ? (
          <dl className={styles.especificaciones}>
            {producto.especificaciones.map((dato) => (
              <div key={dato.clave}>
                <dt>{dato.nombre}</dt>
                <dd>{dato.texto}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className={styles.accion}>
          <AccionProducto
            alAgregarProducto={alAgregarProducto}
            alAbrirWhatsapp={alAbrirWhatsapp}
            cantidad={cantidad}
            demostracion={false}
            modalidad={modalidad}
            permiteAcciones={permiteAcciones}
            /* Con una presentación elegida, la acción es la suya: su precio y su
               nombre. Sin ninguna, la del producto. Se reemplazan los dos campos
               juntos para que el botón no pueda quedar con el precio de una y el
               mensaje de otra. */
            producto={
              variante
                ? { ...producto, precio: variante.precio, accionWhatsapp: variante.accionWhatsapp }
                : producto
            }
          />
        </div>
      </div>
    </dialog>
  );
}
