import Image from "next/image";

import type { Banner } from "../../lib/negocios/banners";
import styles from "./banner-catalogo.module.css";

/* Una franja del catálogo: promoción, aviso o publicidad del negocio.
 *
 * Se coloca dos veces, y por eso recibe cuál dibujar en vez de dibujar las dos:
 * la de arriba va debajo de la portada y la de abajo antes del pie, y esas dos
 * posiciones las decide el armazón, no esta pieza. Es la misma regla que sigue
 * `AccionLlamar`: la pieza pone su disposición, la plantilla pone dónde va.
 *
 * **Sin banner no dibuja nada, ni un hueco.** Es el caso normal —un negocio
 * recién dado de alta no tiene ninguno— y una franja vacía reservando espacio
 * se lee como un error de carga.
 */
export function BannerCatalogo({
  banner,
  className,
}: {
  banner: Banner | undefined;
  className?: string;
}) {
  if (!banner) return null;

  /* La imagen lleva medidas y `sizes` porque es lo más ancho de la pantalla: sin
     eso, el catálogo salta cuando el banner termina de bajar, y ese salto se
     mide en el presupuesto de la fase 9. La proporción la fija el CSS, así que
     acá alcanza con un par de números que mantengan la relación. */
  const imagen = (
    <Image
      alt={banner.alt}
      className={styles.imagen}
      height={200}
      sizes="(min-width: 60rem) 800px, 100vw"
      src={banner.imagen}
      width={800}
    />
  );

  const clases = [styles.banner, className].filter(Boolean).join(" ");

  /* Un banner sin enlace es un aviso, y un aviso no se toca. Envolverlo igual en
     un enlace vacío daría un objetivo táctil enorme que no hace nada, que es
     peor que no ofrecerlo. */
  if (!banner.enlace) {
    return <div className={clases}>{imagen}</div>;
  }

  return (
    <a className={clases} href={banner.enlace} rel="noreferrer noopener" target="_blank">
      {imagen}
    </a>
  );
}
