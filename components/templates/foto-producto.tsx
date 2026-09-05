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
  alVerFotos?: (productoId: string) => void;
};

/* La fotografía se vuelve pulsable solo cuando hay más de una: con una sola no
   hay nada que recorrer, y abrir una pantalla para mostrar lo mismo que ya
   estaba en la tarjeta es un paso de más entre el cliente y su pedido.
   El contador lo dice sin texto: sin él, el destino táctil sería invisible,
   que es justo el problema que tenía el nombre cuando era enlace. */
export function FotoProducto({
  producto,
  ancho,
  sizes,
  className,
  respaldo,
  alVerFotos,
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

  const total = producto.imagenes.length;
  if (!alVerFotos || total < 2) return foto;

  return (
    <button
      aria-label={`Ver las ${total} fotografías de ${producto.nombre}`}
      className={styles.disparador}
      onClick={() => alVerFotos(producto.id)}
      type="button"
    >
      {foto}
      <span aria-hidden="true" className={styles.contador}>
        {total} fotos
      </span>
    </button>
  );
}
