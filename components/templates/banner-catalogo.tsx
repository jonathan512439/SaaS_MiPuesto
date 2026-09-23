import Image from "next/image";

import type { Banner } from "../../lib/negocios/banners";
import { tieneAlgoEncima } from "../../lib/negocios/texto-sobre-imagen";
import styles from "./banner-catalogo.module.css";
import { TextoSobreImagen } from "./texto-sobre-imagen";

/* La franja de publicidad del catálogo: promoción, aviso o publicidad del
 * negocio, entre dos categorías.
 *
 * Recibe cuál dibujar en vez de leerlo del negocio: dónde va lo decide el
 * armazón, no esta pieza. Es la misma regla que sigue `AccionLlamar`: la pieza
 * pone su disposición, la plantilla pone dónde va. (Se colocaba dos veces; el
 * banner de arriba se fue y lo que se escribía sobre él va ahora sobre la
 * portada.)
 *
 * **Sin banner no dibuja nada, ni un hueco.** Es el caso normal —un negocio
 * recién dado de alta no tiene ninguno— y una franja vacía reservando espacio
 * se lee como un error de carga.
 *
 * El diseño de referencia trae texto sobre la imagen: antetítulo, título,
 * bajada y botón. Todo opcional; sin nada de eso el banner es solo su imagen,
 * como los que hoy tienen cargados los negocios.
 */
export function BannerCatalogo({
  banner,
  className,
}: {
  banner: Banner | null | undefined;
  className?: string;
}) {
  if (!banner) return null;

  /* La imagen llena la franja, y la franja tiene su forma en el CSS: así el
     catálogo no salta cuando el banner termina de bajar.

     Con `fill` y no con medidas. En producción, `next/image` pasa por @unpic,
     que convierte `width` y `height` en un tope fijo —800 × 200— escrito en el
     propio elemento: en una tablet o una computadora el banner quedaba en una
     esquina de su franja, y además se pedía recortado a 4:1 cuando la franja es
     2:1. */
  const imagen = (
    <Image
      alt={banner.alt}
      className={styles.imagen}
      fill
      sizes="(min-width: 64rem) 832px, 100vw"
      src={banner.imagen}
    />
  );

  /* La misma pregunta que decide si hay cortina: con texto, o con un botón que
     lleve a alguna parte. */
  const tieneTexto = tieneAlgoEncima(banner);
  const clases = [styles.banner, className].filter(Boolean).join(" ");

  /* Sin texto encima, el banner es una imagen y nada más. Con enlace, la imagen
     entera lleva; sin enlace, es un aviso y no se toca. Envolver un aviso en un
     enlace vacío daría un objetivo táctil enorme que no hace nada. */
  if (!tieneTexto) {
    if (!banner.enlace) return <div className={clases}>{imagen}</div>;
    return (
      <a className={clases} href={banner.enlace} rel="noreferrer noopener" target="_blank">
        {imagen}
      </a>
    );
  }

  /* Con texto, el conjunto no se envuelve en un solo enlace: el botón es el
     enlace, y anidar un enlace dentro de otro no es válido. La imagen queda de
     fondo y el texto va sobre su cortina, que es la misma pieza que en la
     portada. */
  return (
    <figure className={clases}>
      {imagen}
      <TextoSobreImagen className={styles.contenido} como="figcaption" texto={banner} />
    </figure>
  );
}
