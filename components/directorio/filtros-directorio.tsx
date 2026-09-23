"use client";

import styles from "./pantalla-directorio.module.css";

/* Zona y rubro, que se aplican solos al elegir.
 *
 * Es un formulario `GET` común: sin JavaScript aparece el botón «Aplicar» y
 * funciona igual. Con JavaScript, cambiar un desplegable ya busca, que es lo
 * que se espera de un filtro en un teléfono.
 */
export function FiltrosDelDirectorio({
  accion,
  texto,
  cerca,
  zonas,
  rubros,
  zonaElegida,
  rubroElegido,
  rubroFijo,
}: {
  accion: string;
  texto: string;
  cerca: string | null;
  zonas: ReadonlyArray<{ id: string; nombre: string }>;
  rubros: ReadonlyArray<{ id: string; nombre: string }>;
  zonaElegida: string | null;
  rubroElegido: string | null;
  /* En la página de un rubro, el rubro ya viene en la dirección. */
  rubroFijo: boolean;
}) {
  if (zonas.length === 0 && (rubros.length === 0 || rubroFijo)) return null;

  return (
    <form action={accion} className={styles.filtros} method="get">
      {texto ? <input name="q" type="hidden" value={texto} /> : null}
      {cerca ? <input name="cerca" type="hidden" value={cerca} /> : null}
      {zonas.length > 0 ? (
        <label>
          <span>Zona</span>
          <select
            defaultValue={zonaElegida ?? ""}
            name="zona"
            onChange={(evento) => evento.currentTarget.form?.requestSubmit()}
          >
            <option value="">Todas</option>
            {zonas.map(({ id, nombre }) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {rubros.length > 0 && !rubroFijo ? (
        <label>
          <span>Rubro</span>
          <select
            defaultValue={rubroElegido ?? ""}
            name="rubro"
            onChange={(evento) => evento.currentTarget.form?.requestSubmit()}
          >
            <option value="">Todos</option>
            {rubros.map(({ id, nombre }) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <noscript>
        <button type="submit">Aplicar</button>
      </noscript>
    </form>
  );
}
