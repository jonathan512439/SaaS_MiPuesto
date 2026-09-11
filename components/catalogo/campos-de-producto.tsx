"use client";

import type { Atributo } from "../../lib/catalogo/atributos";
import type { ValorAtributo } from "../../lib/catalogo/valores";
import { Campo, Selector } from "../ui";
import styles from "./campos-de-producto.module.css";

/* Los datos propios del producto, según la categoría que tenga elegida.
 *
 * El formulario **no tiene una lista fija de campos**: dibuja los que su
 * categoría declaró. Es lo que permite que la misma pantalla sirva para un foco
 * —potencia, casquillo, color de luz— y para una bolsa de alimento —especie,
 * etapa, peso— sin una rama por rubro.
 *
 * Si la categoría no declaró ninguno, no se dibuja nada: un bloque vacío con
 * título haría creer que falta completar algo.
 */
export function CamposDeProducto({
  atributos,
  valores,
  errores,
  alCambiar,
}: {
  atributos: ReadonlyArray<Atributo>;
  valores: Record<string, ValorAtributo>;
  errores: Record<string, string>;
  alCambiar: (clave: string, valor: ValorAtributo | null) => void;
}) {
  if (atributos.length === 0) return null;

  return (
    <fieldset className={styles.bloque}>
      <legend>Datos de esta categoría</legend>

      {atributos.map((atributo) => {
        const id = `atributo-${atributo.clave}`;
        const error = errores[`atributos.${atributo.clave}`];
        const valor = valores[atributo.clave];

        if (atributo.tipo === "si_no") {
          return (
            <label className={styles.interruptor} key={atributo.clave}>
              <input
                checked={valor === true}
                id={id}
                onChange={(evento) => alCambiar(atributo.clave, evento.target.checked)}
                type="checkbox"
              />
              <span>
                {atributo.nombre}
                {atributo.obligatorio ? <em> · obligatorio</em> : null}
              </span>
              {error ? <strong className={styles.error}>{error}</strong> : null}
            </label>
          );
        }

        if (atributo.tipo === "opcion") {
          return (
            <Selector
              error={error}
              etiqueta={atributo.nombre}
              id={id}
              key={atributo.clave}
              onChange={(evento) => alCambiar(atributo.clave, evento.target.value || null)}
              value={typeof valor === "string" ? valor : ""}
            >
              {/* La opción vacía va primero y siempre, incluso si el campo es
                  obligatorio: sin ella, abrir el formulario elegiría la primera
                  opción sola y el dueño guardaría un casquillo que nunca eligió. */}
              <option value="">Sin elegir</option>
              {atributo.opciones.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </Selector>
          );
        }

        return (
          <Campo
            error={error}
            etiqueta={
              atributo.unidad ? `${atributo.nombre} (${atributo.unidad})` : atributo.nombre
            }
            id={id}
            key={atributo.clave}
            /* `inputMode` y no `type="number"`: en el teléfono abre el teclado
               numérico igual, y evita las flechitas que en escritorio cambian el
               valor con la rueda del mouse sin que nadie lo pida. */
            inputMode={atributo.tipo === "numero" ? "decimal" : undefined}
            maxLength={atributo.tipo === "numero" ? 12 : 80}
            onChange={(evento) => alCambiar(atributo.clave, evento.target.value || null)}
            placeholder={atributo.tipo === "numero" ? "0" : ""}
            /* `Campo` ya dibuja el rótulo «Obligatorio» al lado de la etiqueta:
               se aprovecha en vez de inventar otra forma de decir lo mismo. */
            required={atributo.obligatorio}
            value={valor === undefined || valor === null ? "" : String(valor)}
          />
        );
      })}
    </fieldset>
  );
}
