import Image from "next/image";
import type { ReactNode } from "react";

import type { ProductoPlantilla } from "../../lib/plantillas/tipos";
import styles from "./foto-producto.module.css";

type PropiedadesFotoProducto = {
  producto: ProductoPlantilla;
  ancho: number;
  sizes: string;
  className?: string;
  respaldo: ReactNode;
  alVerProducto?: (productoId: string) => void;
  /* La pastilla que va sobre la esquina de la fotografía. Se recibe en vez de
     calcularse acá porque no todas las plantillas la quieren: Feria y Mínima
     dibujan miniaturas de 64 y 96 píxeles, y una pastilla encima de eso tapa la
     foto y no se lee. */
  insignias?: ReactNode;
};

/* La fotografía abre la ficha del producto, tenga una foto o cuatro: adentro
   están la descripción entera, el precio y la acción, así que la ficha vale
   incluso sin galería que recorrer.
   El rótulo dice qué hace al tocarla. Sin él sería un destino táctil invisible,
   que es exactamente lo que fallaba cuando el nombre era enlace. */
export function FotoProducto({
  producto,
  ancho,
  sizes,
  className,
  respaldo,
  alVerProducto,
  insignias,
}: PropiedadesFotoProducto) {
  /* Un producto sin fotografía también lleva su pastilla: que esté agotado o de
     oferta no depende de que alguien haya subido la imagen. */
  if (!producto.imagen) return conInsignias(respaldo, insignias);

  const foto = (
    <Image
      alt={producto.imagen.alt}
      className={className}
      height={ancho}
      sizes={sizes}
      src={producto.imagen.src}
      width={ancho}
    />
  );

  if (!alVerProducto) return conInsignias(foto, insignias);

  const total = producto.imagenes.length;

  return conInsignias(
    <button
      aria-label={
        total > 1
          ? `Ver ${producto.nombre}, ${total} fotografías`
          : `Ver ${producto.nombre}`
      }
      className={styles.disparador}
      onClick={() => alVerProducto(producto.id)}
      type="button"
    >
      {foto}
      <span aria-hidden="true" className={styles.rotulo}>
        {total > 1 ? `Ver · ${total} fotos` : "Ver"}
      </span>
    </button>,
    insignias,
  );
}

/* El marco solo aparece cuando hay una pastilla que colocar. Envolver siempre
   agregaría un elemento a la rejilla de las cuatro plantillas para no dibujar
   nada, y las dos que no usan pastillas no tienen por qué pagar ese cambio. */
function conInsignias(contenido: ReactNode, insignias: ReactNode) {
  if (!insignias) return <>{contenido}</>;
  return (
    <span className={styles.marco}>
      {contenido}
      {insignias}
    </span>
  );
}
