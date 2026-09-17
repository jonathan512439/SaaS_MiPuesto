"use client";

import { useEffect, useId, useRef } from "react";

import type { PaletaId } from "../../lib/apariencia";
import type { ModoAccionCatalogo } from "../../lib/modalidades";
import type { ProductoPlantilla } from "../../lib/plantillas/tipos";
import temaStyles from "../templates/tema-catalogo.module.css";
import { FichaProducto } from "./ficha-producto";
import styles from "./hoja-producto.module.css";

type PropiedadesHojaProducto = {
  producto: ProductoPlantilla | null;
  paleta: PaletaId;
  modalidad: ModoAccionCatalogo;
  permiteAcciones: boolean;
  cantidad: number;
  /* Hace falta para pedir los horarios y para reservar: las dos rutas cuelgan
     del negocio, no del producto. */
  slug: string;
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
  slug,
  onCerrar,
  alAgregarProducto,
  alAbrirWhatsapp,
}: PropiedadesHojaProducto) {
  const referencia = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const abierta = producto !== null;


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

      <FichaProducto
        alAgregarProducto={alAgregarProducto}
        alAbrirWhatsapp={alAbrirWhatsapp}
        cantidad={cantidad}
        idTitulo={idTitulo}
        modalidad={modalidad}
        permiteAcciones={permiteAcciones}
        producto={producto}
        slug={slug}
      />
    </dialog>
  );
}
