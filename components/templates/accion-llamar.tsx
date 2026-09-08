import { normalizarTelefonoWhatsappPublico } from "../../lib/whatsapp";
import { Icono } from "../iconos/icono";
import styles from "./accion-llamar.module.css";

/* Llamar por teléfono, al lado de escribir por WhatsApp.
 *
 * **Usa el mismo número de WhatsApp del negocio**, y no un campo nuevo. En
 * Bolivia el WhatsApp de un comercio es su celular: pedirle al dueño que cargue
 * el mismo número dos veces sería trabajo para él y una oportunidad de que los
 * dos queden distintos. El día que un negocio necesite una línea aparte para
 * llamadas, ahí sí conviene el campo.
 *
 * No todo el mundo escribe. Hay clientes —y clientas mayores sobre todo— que
 * prefieren llamar, y hasta ahora el catálogo no les daba ninguna forma de
 * hacerlo sin copiar el número a mano.
 *
 * El número se normaliza igual que el de WhatsApp: si vienen ocho dígitos se le
 * pone el 591 adelante. Un `tel:` sin código de país funciona desde adentro del
 * país y falla desde afuera, que es justo el caso de quien tiene el catálogo
 * compartido por un pariente que vive lejos.
 */
export function AccionLlamar({
  className,
  telefono,
}: {
  className?: string;
  telefono: string;
}) {
  const numero = normalizarTelefonoWhatsappPublico(telefono);
  if (!numero) return null;

  /* Las dos clases juntas: la de acá pone la disposición y el alto, la de la
     plantilla pone el color y el cuerpo. Separadas así, agregar una quinta
     plantilla no obliga a volver a resolver dónde va el ícono. */
  return (
    <a className={[styles.enlace, className].filter(Boolean).join(" ")} href={`tel:+${numero}`}>
      <Icono className={styles.icono} nombre="telefono" />
      Llamar
    </a>
  );
}
