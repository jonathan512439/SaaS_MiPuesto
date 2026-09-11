import styles from "./linea-atributos.module.css";

/* Los datos propios del producto, en una línea: «9 W · E27 · Cálida».
 *
 * Es lo que hace que una ferretería se vea como una ferretería y una veterinaria
 * como una veterinaria, sin que cambie ninguna regla de estilo. Reemplaza a las
 * seis formas de tarjeta que el plan retira: lo que distingue a un rubro de otro
 * no es la estructura de la tarjeta, son los datos que muestra.
 *
 * Llega ya resuelta desde `lib/catalogo/valores.ts` —filtrada a los campos que el
 * dueño marcó y con las unidades pegadas—, así que acá no hay nada que decidir.
 * Si no hay nada que mostrar, no se dibuja: un renglón en blanco dentro de una
 * tarjeta se ve como un error de carga.
 */
export function LineaAtributos({ linea }: { linea: string | null }) {
  if (!linea) return null;
  return <p className={styles.linea}>{linea}</p>;
}
