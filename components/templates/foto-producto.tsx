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
}: PropiedadesFotoProducto) {
  if (!producto.imagen) return <>{respaldo}</>;

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

  if (!alVerProducto) return foto;

  const total = producto.imagenes.length;

  return (
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
    </button>
  );
}
