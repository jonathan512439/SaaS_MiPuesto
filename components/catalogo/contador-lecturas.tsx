import {
  cuandoVuelvenLasLecturas,
  periodoDeLecturas,
  type CupoDeLecturas,
} from "../../lib/ia/cupo-de-lecturas";
import { Icono } from "../iconos/icono";
import styles from "./contador-lecturas.module.css";

/* Cuántas lecturas con IA quedan, pegado al botón que las gasta.
 *
 * Va en cada lugar del panel donde se usa la IA y no solo en el inicio: la
 * pregunta «¿me queda?» aparece justo antes de tocar, y una cuenta que hay que
 * ir a buscar no la busca nadie. No lleva estado: quien gasta la lectura le
 * pasa el cupo ya descontado (`gastarLectura`), y así sirve igual en una página
 * del servidor que dentro de un formulario.
 *
 * En cero no se esconde ni cambia solo de color: dice qué pasa después. Con
 * `aria-live`, quien usa lector de pantalla escucha el número nuevo después de
 * cada lectura. `className` reemplaza el aspecto para cuando va sobre el
 * degradado de IA del formulario de producto. */
export function ContadorLecturas({
  cupo,
  className,
}: {
  cupo: CupoDeLecturas;
  className?: string;
}) {
  return (
    <p aria-live="polite" className={className ?? styles.contador}>
      <span>
        <Icono nombre="rayo" />
        Te {cupo.quedan === 1 ? "queda" : "quedan"} <strong>{cupo.quedan}</strong> de {cupo.total}{" "}
        lecturas con IA {periodoDeLecturas(cupo)}
      </span>
      {cupo.quedan === 0 ? <small>{cuandoVuelvenLasLecturas(cupo)}</small> : null}
    </p>
  );
}
