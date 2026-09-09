import type { TarjetaId } from "../../../lib/apariencia";
import { TarjetaCuadricula } from "./cuadricula";
import { TarjetaFicha } from "./ficha";
import { TarjetaLista } from "./lista";
import { TarjetaServicio } from "./servicio";
import { TarjetaEstadia, TarjetaRetrato } from "./formas-nuevas";
import type { PropiedadesTarjeta } from "./tipos";

export type { ProductoEnTarjeta, PropiedadesTarjeta } from "./tipos";

/* Qué componente dibuja cada forma. Están las seis.
 *
 * **Cuidado al declarar una forma nueva en una plantilla:** no todas devuelven
 * el mismo elemento. Cinco devuelven un `li`, para plantillas que listan con
 * `ul`; `servicio` devuelve un `div` con `dt` y `dd`, porque Mínima lista con
 * `dl`. Meter una en el contenedor de la otra da HTML inválido, y por eso
 * `TARJETAS_POR_PLANTILLA` no es una tabla libre: cada plantilla declara las
 * que su contenedor admite. Lo verifica una prueba. */
const TARJETAS_DISPONIBLES: Partial<
  Record<TarjetaId, (propiedades: PropiedadesTarjeta) => React.ReactElement>
> = {
  cuadricula: TarjetaCuadricula,
  ficha: TarjetaFicha,
  lista: TarjetaLista,
  servicio: TarjetaServicio,
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
