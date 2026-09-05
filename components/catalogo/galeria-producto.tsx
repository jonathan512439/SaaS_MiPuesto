"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import type { PaletaId } from "../../lib/apariencia";
import temaStyles from "../templates/tema-catalogo.module.css";
import styles from "./galeria-producto.module.css";

type PropiedadesGaleria = {
  abierta: boolean;
  titulo: string;
  paleta: PaletaId;
  imagenes: Array<{ src: string; alt: string }>;
  onCerrar: () => void;
};

/* Solo aparece cuando un producto tiene más de una fotografía. Con una sola no
   hay nada que recorrer, y una galería que se abre para mostrar lo mismo que ya
   estaba en la tarjeta es un paso de más entre el cliente y su pedido. */
export function GaleriaProducto({
  abierta,
  titulo,
  paleta,
  imagenes,
  onCerrar,
}: PropiedadesGaleria) {
  const referencia = useRef<HTMLDialogElement>(null);
  const [actual, setActual] = useState(0);
  const [abiertaAntes, setAbiertaAntes] = useState(abierta);
  const idTitulo = useId();

  /* Cada apertura empieza por la primera: quien vuelve a abrir espera ver la
     foto de la tarjeta, no la última que dejó al mirar otro producto. Se ajusta
     durante el render para no dibujar una vez con la fotografía anterior. */
  if (abierta !== abiertaAntes) {
    setAbiertaAntes(abierta);
    if (abierta) setActual(0);
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

  if (imagenes.length === 0) return null;

  const total = imagenes.length;
  const mover = (paso: number) => setActual((indice) => (indice + paso + total) % total);
  const imagen = imagenes[Math.min(actual, total - 1)];

  return (
    <dialog
      aria-labelledby={idTitulo}
      className={`${temaStyles.tema} ${styles.galeria}`}
      data-paleta={paleta}
      onCancel={(evento) => {
        evento.preventDefault();
        onCerrar();
      }}
      onClick={(evento) => {
        if (evento.target === referencia.current) onCerrar();
      }}
      onKeyDown={(evento) => {
        if (evento.key === "ArrowRight") mover(1);
        if (evento.key === "ArrowLeft") mover(-1);
      }}
      ref={referencia}
    >
      <div className={styles.cabecera}>
        <h2 className={styles.titulo} id={idTitulo}>
          {titulo}
        </h2>
        <button
          aria-label="Cerrar las fotografías"
          className={styles.cerrar}
          onClick={onCerrar}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      {/* `contain` y no `cover`: la galería existe para ver la fotografía
          entera, que es justo lo que la miniatura de la tarjeta recorta. */}
      <div className={styles.lienzo}>
        <Image
          alt={imagen.alt}
          className={styles.imagen}
          height={1200}
          sizes="(min-width: 48rem) 40rem, 100vw"
          src={imagen.src}
          width={1200}
        />
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
      </div>

      <div className={styles.pie}>
        <p aria-live="polite" className={styles.conteo}>
          {actual + 1} de {total}
        </p>
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
      </div>
    </dialog>
  );
}
