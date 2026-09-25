import { headers } from "next/headers";

import {
  ISOTIPO_GROSOR,
  ISOTIPO_PIEZAS,
  ISOTIPO_VIEWBOX,
} from "../../lib/marca/isotipo";
import { CABECERA_NONCE } from "../../lib/seguridad/politica-contenido";
import styles from "./introduccion.module.css";

/* El nombre, letra por letra. Ocho, y ocho reglas de demora en el CSS: si algún
   día la marca cambia de nombre hay que tocar las dos, y está anotado ahí. */
const NOMBRE = "MiPuesto";

/* La marca que dice que esta sesión ya vio la animación. */
export const CLAVE_INTRODUCCION = "mipuesto-marca-vista";

/* El guion que decide **antes de pintar**.
 *
 * Va inline y antes de la capa a propósito: si esperara a que React hidrate, la
 * segunda visita mostraría el logotipo un instante y lo borraría de golpe, que
 * se ve peor que no tener animación. Acá el navegador lee el atributo mientras
 * todavía está armando el documento, y la capa nace escondida.
 *
 * **Es lo único que la muestra.** La capa nace escondida y sale solo con
 * `data-marca="presentando"`, que pone este guion. Un guion en línea corre
 * cuando la página se carga entera y nunca en una navegación interna, así que
 * quien entró por un producto compartido y vuelve al catálogo con «Ver pedido»
 * no la ve: antes salía por defecto, y justo en ese caso nadie la escondía ni
 * escuchaba el toque para cortarla.
 *
 * Hace tres cosas y nada más:
 *
 * 1. Si esta sesión ya la vio, marca la raíz y se va. Una vez por sesión, no una
 *    por visita: quien entra al catálogo, mira un producto y vuelve no paga tres
 *    veces tres segundos.
 * 2. Si no, la anota, la presenta y queda escuchando el primer toque, rueda,
 *    deslizamiento o tecla para cortarla. Quien ya sabe lo que busca no tiene
 *    que esperar a que la marca termine de presentarse.
 * 3. Y cuando termina, **marca la raíz como vista**: al ir a un producto y
 *    volver no se recarga la página —el `<html>` es el mismo y este guion no
 *    corre de nuevo—, y el atributo es lo que la deja escondida.
 *
 * Sin `sessionStorage` —navegación privada, almacenamiento bloqueado— la
 * animación sale igual. Se pierde el «una vez por sesión», que es una comodidad;
 * romper el catálogo por eso no sería un intercambio razonable. */
const GUION = `(function(){
var r=document.documentElement;
try{
if(sessionStorage.getItem(${JSON.stringify(CLAVE_INTRODUCCION)})){r.dataset.marca="vista";return;}
sessionStorage.setItem(${JSON.stringify(CLAVE_INTRODUCCION)},"si");
}catch(e){}
r.dataset.marca="presentando";
var n=["pointerdown","wheel","touchmove","keydown"];
function quitar(){n.forEach(function(t){window.removeEventListener(t,salir)});}
function salir(){r.dataset.marca="saltada";quitar();}
n.forEach(function(t){window.addEventListener(t,salir,{passive:true});});
setTimeout(function(){quitar();r.dataset.marca="vista";},2000);
})();`;

/* La presentación de la marca: el isotipo se dibuja solo y el nombre se escribe
 * detrás.
 *
 * SVG y CSS únicamente: empieza con el HTML servido y termina aunque JavaScript
 * no llegue nunca a hidratar. El único JavaScript es el guion de arriba, que la
 * presenta y la saca antes. Si JavaScript está apagado del todo, la marca no
 * sale: se pierde un adorno, no el catálogo.
 *
 * Tres cosas que la vuelven barata, porque abajo hay un catálogo que ya está
 * dibujado —el HTML viene con los productos— y esta capa no esconde una espera,
 * la inventaría:
 *
 * - No bloquea. `pointer-events: none` desde el primer fotograma: se puede
 *   tocar, bajar y pedir con la marca todavía en pantalla.
 * - No se repite. Una vez por sesión.
 * - No estorba. Se corta al primer toque, y no sale si la visita viene apuntada
 *   a algo —una búsqueda, una categoría, la página de un producto—, que es lo
 *   que decide quien la coloca.
 *
 * Las cinco piezas salen de `lib/marca/isotipo.ts`: es el mismo dibujo que la
 * barra del panel y la marca de agua del QR, con el mismo grosor.
 *
 * El guion lleva el nonce de la solicitud: la política de contenido bloquea
 * todo script en línea que no lo tenga (`lib/seguridad/politica-contenido.ts`).
 */
export async function Introduccion() {
  const nonce = (await headers()).get(CABECERA_NONCE) ?? undefined;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: GUION }} nonce={nonce} />
      <div aria-hidden="true" className={styles.introduccion}>
        <div className={styles.marca}>
          <svg
            className={styles.isotipo}
            fill="none"
            focusable="false"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={ISOTIPO_GROSOR}
            viewBox={ISOTIPO_VIEWBOX}
            xmlns="http://www.w3.org/2000/svg"
          >
            {ISOTIPO_PIEZAS.map(({ nombre, trazo }) => (
              <path
                className={styles[nombre]}
                d={trazo}
                key={nombre}
                /* Normaliza el largo del trazo a 1 para que el mismo par de
                   reglas de guiones sirva para las cinco piezas, que miden
                   cosas muy distintas. */
                pathLength="1"
              />
            ))}
          </svg>

          <span className={styles.nombre}>
            {Array.from(NOMBRE).map((letra, indice) => (
              <span className={styles.letra} key={`${letra}-${indice}`}>
                {letra}
              </span>
            ))}
          </span>
        </div>
      </div>
    </>
  );
}
