import type { TarjetaId } from "../../../lib/apariencia";
import { TarjetaCuadricula } from "./cuadricula";
import { TarjetaEstadia, TarjetaRetrato } from "./formas-nuevas";
import type { PropiedadesTarjeta } from "./tipos";

export type { ProductoEnTarjeta, PropiedadesTarjeta } from "./tipos";

/* Qué componente dibuja cada forma.
 *
 * **El mapa es parcial a propósito.** Las tarjetas se extraen de a una, junto
 * con la plantilla que las usa, y declarar acá una que todavía vive incrustada
 * en su plantilla no la haría existir: la dejaría prometida y vacía.
 *
 * Tres están: la de Moderna, ya extraída, y las dos formas nuevas, que no salen
 * de ninguna plantilla. Faltan `lista` (Clásica), `ficha` (Feria) y `servicio`
 * (Mínima), que llegan cuando se conecte su plantilla.
 *
 * Que falten no expone a nadie: una plantilla que todavía dibuja sus productos
 * adentro no pasa por acá, y el panel donde el dueño elige la forma llega
 * después. Lo verifica una prueba, que compara este mapa contra las tarjetas que
 * declaran las plantillas ya conectadas. */
const TARJETAS_DISPONIBLES: Partial<
  Record<TarjetaId, (propiedades: PropiedadesTarjeta) => React.ReactElement>
> = {
  cuadricula: TarjetaCuadricula,
  retrato: TarjetaRetrato,
  estadia: TarjetaEstadia,
};

export function tarjetaDisponible(tarjeta: TarjetaId): boolean {
  return tarjeta in TARJETAS_DISPONIBLES;
}

/* Dibuja el producto con la forma que eligió el negocio.
 *
 * Si la forma no está, **falla ruidosamente en vez de dibujar otra**. Un
 * repliegue silencioso a la cuadrícula dejaría a un negocio viendo una forma que
 * no eligió sin que nada lo diga, que es exactamente la clase de error que este
 * proyecto viene pagando caro. La combinación ya se corrigió antes de llegar
 * acá, en `tarjetaValidaPara`; si aun así falta, es un error de programación y
 * tiene que verse como tal. */
export function TarjetaProducto({
  tarjeta,
  ...propiedades
}: PropiedadesTarjeta & { tarjeta: TarjetaId }) {
  const Componente = TARJETAS_DISPONIBLES[tarjeta];
  if (!Componente) {
    throw new Error(
      `La tarjeta «${tarjeta}» todavía no está extraída de su plantilla. ` +
        `Disponibles: ${Object.keys(TARJETAS_DISPONIBLES).join(", ")}.`,
    );
  }
  return <Componente {...propiedades} />;
}
