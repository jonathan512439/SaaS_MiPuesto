import { anclaDelCatalogo } from "../../lib/negocios/destino-banner";
import {
  tieneAlgoEncima,
  type TextoSobreImagen as Texto,
} from "../../lib/negocios/texto-sobre-imagen";
import styles from "./texto-sobre-imagen.module.css";

/* El texto que va encima de una imagen ancha: antetítulo, título, bajada y
 * botón, sobre una cortina que lo hace legible.
 *
 * Lo usan la portada y el banner de publicidad, que son el mismo cartel en dos
 * lugares. Antes cada uno tenía el suyo, con la misma tipografía escrita dos
 * veces y dos cortinas de distinta opacidad: el dueño veía la portada más
 * velada que el banner sin que nadie lo hubiera decidido. Una sola pieza, una
 * sola cortina.
 *
 * **Sin nada que escribir no dibuja nada**, y con eso tampoco hay cortina: el
 * sombreado existe para que la letra se lea sobre la foto, y una foto sin
 * letra se muestra entera. Es lo que el dueño pidió: «que se active el
 * sombreado únicamente si se elige poner texto y botones encima».
 *
 * Quien lo coloca dice cómo se ubica —la portada lo pone encima de su imagen,
 * el banner lo estira al alto de su franja— con `className`; lo de adentro es
 * de esta pieza.
 */
export function TextoSobreImagen({
  texto,
  className,
  como: Etiqueta = "div",
}: {
  texto: Texto;
  className?: string;
  /* `figcaption` dentro de una `figure`, que es lo que es el banner; `div` en
     la portada, que es una sección. */
  como?: "div" | "figcaption";
}) {
  if (!tieneAlgoEncima(texto)) return null;

  /* Un destino dentro del catálogo baja en la misma página; uno de afuera abre
     aparte, para no sacar al visitante del negocio. */
  const ancla = anclaDelCatalogo(texto.enlace);

  return (
    <Etiqueta className={[styles.contenido, className].filter(Boolean).join(" ")}>
      {texto.eyebrow ? <p className={styles.eyebrow}>{texto.eyebrow}</p> : null}
      {texto.titulo ? <p className={styles.titulo}>{texto.titulo}</p> : null}
      {texto.copy ? <p className={styles.copy}>{texto.copy}</p> : null}
      {texto.boton && texto.enlace ? (
        <a
          className={styles.boton}
          href={ancla ?? texto.enlace}
          rel={ancla ? undefined : "noreferrer noopener"}
          target={ancla ? undefined : "_blank"}
        >
          {texto.boton}
        </a>
      ) : null}
    </Etiqueta>
  );
}
