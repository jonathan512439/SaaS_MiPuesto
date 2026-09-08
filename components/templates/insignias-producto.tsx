import type { ProductoPlantilla } from "../../lib/plantillas/tipos";
import styles from "./insignias-producto.module.css";

/* La pastilla de color sobre la esquina de la fotografía.
 *
 * **Todo sale de datos que ya existen.** No hay ningún campo nuevo ni ninguna
 * etiqueta que el dueño tenga que escribir: una oferta es una promoción
 * vigente, «agotado» es el estado del producto y «quedan pocas» es su
 * existencia. Inventar un campo de etiquetas habría sido pedirle trabajo al
 * dueño para mostrar algo que el sistema ya sabe.
 *
 * Se muestra una sola. Dos pastillas en la misma esquina se anulan: la vista
 * deja de leerlas y pasan a ser adorno. El orden es el de urgencia para quien
 * compra —no poder comprarlo importa más que el descuento— y el primero que se
 * cumple gana.
 */

/* Tres o menos. Con un número más alto la urgencia deja de ser cierta y la
   pastilla se vuelve un adorno permanente que nadie mira. */
const POCAS_UNIDADES = 3;

export type Insignia = { tipo: "agotado" | "ultimas" | "oferta"; texto: string };

/* La decisión vive en una función y no dentro del componente porque hay quien
   necesita saberla sin dibujarla: la tarjeta muestra «Quedan 2 unidades» debajo
   del nombre, y con la pastilla diciendo «Quedan 2» encima de la foto sería lo
   mismo escrito dos veces en la misma tarjeta. Preguntando acá, la plantilla
   calla el renglón cuando la pastilla ya lo dijo, y las dos formas no se pueden
   desincronizar. */
export function insigniaDe(producto: ProductoPlantilla): Insignia | null {
  if (producto.estado === "agotado") return { tipo: "agotado", texto: "Agotado" };

  if (
    producto.controlaStock &&
    producto.cantidadDisponible !== null &&
    producto.cantidadDisponible > 0 &&
    producto.cantidadDisponible <= POCAS_UNIDADES
  ) {
    return {
      tipo: "ultimas",
      texto: producto.cantidadDisponible === 1 ? "Queda 1" : `Quedan ${producto.cantidadDisponible}`,
    };
  }

  if (producto.tienePromocion) return { tipo: "oferta", texto: "Oferta" };

  return null;
}

export function InsigniaProducto({ producto }: { producto: ProductoPlantilla }) {
  const insignia = insigniaDe(producto);
  if (!insignia) return null;
  return <span className={styles[insignia.tipo]}>{insignia.texto}</span>;
}
