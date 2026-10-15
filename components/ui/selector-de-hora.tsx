"use client";

import { horasDelDia } from "../../lib/calendario";
import { Selector } from "./selector";

/* Un campo de hora en 24 horas: «09:00», «14:30».
 *
 * Reemplaza a `type="time"`, que en muchos teléfonos y computadoras mostraba
 * «02:30 PM». Es un desplegable con las horas cada `paso` minutos: en un
 * teléfono abre la lista propia del sistema, que es la más cómoda con el dedo.
 * Si el valor guardado no cae en un paso —«09:07», cargado antes—, se ofrece
 * igual, para no cambiarlo sin que el dueño lo toque. */
export function SelectorDeHora({
  id,
  etiqueta,
  valor,
  alCambiar,
  paso = 15,
  desde,
  ayuda,
  required,
  descripcion,
  textoVacio,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  alCambiar: (hora: string) => void;
  paso?: number;
  /* La primera hora que se ofrece, si antes de ella no tiene sentido. */
  desde?: string;
  ayuda?: string;
  required?: boolean;
  /* Lo que oye un lector de pantalla cuando la etiqueta visible es corta y se
     repite: «Abre» siete veces no dice de qué día. */
  descripcion?: string;
  /* Si se puede dejar sin hora, lo que dice esa opción: «Todo el día». */
  textoVacio?: string;
}) {
  const horas = horasDelDia(paso).filter((hora) => !desde || hora >= desde);
  const opciones = valor && !horas.includes(valor) ? [...horas, valor].sort() : horas;
  return (
    <Selector
      aria-label={descripcion}
      ayuda={ayuda}
      etiqueta={etiqueta}
      id={id}
      onChange={(evento) => alCambiar(evento.target.value)}
      required={required}
      value={valor}
    >
      {textoVacio !== undefined ? (
        <option value="">{textoVacio}</option>
      ) : valor ? null : (
        <option value="">Elige la hora</option>
      )}
      {opciones.map((hora) => (
        <option key={hora} value={hora}>
          {hora}
        </option>
      ))}
    </Selector>
  );
}
