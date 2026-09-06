import {
  LIMITE_ARCHIVOS_BYTES,
  LIMITE_BASE_BYTES,
  calcularPorcentaje,
  formatearBytes,
  negociosQueTodaviaEntran,
  nivelDeUso,
  type UsoAlmacenamiento,
} from "../../lib/plataforma/almacenamiento";
import styles from "./uso-almacenamiento.module.css";

/* Se calcula al consultar y no con un contador guardado: un contador mantenido
   por disparadores se desincroniza al primer borrado que no pase por la
   aplicación, y un número de ocupación equivocado es peor que no tener número,
   porque se decide con él. Sumar unos miles de filas es barato.

   El efecto práctico es el que se pidió: cada foto que se sube o se borra ya
   cambia el número de la próxima vez que se abre esta pantalla, sin que nadie
   tenga que acordarse de actualizar nada. */
function Medidor({
  titulo, bytes, limite, detalle,
}: {
  titulo: string;
  bytes: number;
  limite: number;
  detalle: string;
}) {
  const porcentaje = calcularPorcentaje(bytes, limite);
  return (
    <div className={styles.medidor} data-nivel={nivelDeUso(bytes, limite)}>
      <div className={styles.cifras}>
        <span className={styles.titulo}>{titulo}</span>
        <strong>
          {formatearBytes(bytes)} <span>de {formatearBytes(limite)}</span>
        </strong>
      </div>
      {/* `<progress>` y no un div con ancho en línea: el navegador ya sabe
          dibujar esto, los lectores de pantalla lo anuncian solos y el valor
          viaja como atributo, sin estilos calculados en el JSX. */}
      <progress className={styles.barra} max={100} value={porcentaje}>
        {porcentaje} % ocupado
      </progress>
      <p className={styles.detalle}>
        {porcentaje} % · {detalle}
      </p>
    </div>
  );
}

export function UsoAlmacenamientoPanel({ uso }: { uso: UsoAlmacenamiento | null }) {
  if (!uso) {
    return (
      <section aria-labelledby="almacenamiento" className={styles.panel}>
        <h2 id="almacenamiento">Almacenamiento</h2>
        <p className={styles.vacio}>No se pudo medir la ocupación en este momento.</p>
      </section>
    );
  }

  const conArchivos = uso.negocios.filter(({ archivos }) => archivos > 0);
  const entran = negociosQueTodaviaEntran(uso.bytes_totales, conArchivos.length);

  return (
    <section aria-labelledby="almacenamiento" className={styles.panel}>
      <header>
        <h2 id="almacenamiento">Almacenamiento</h2>
        <p>
          {uso.archivos_totales} archivo(s) de {conArchivos.length} negocio(s) con
          fotografías.
          {entran !== null
            ? ` Al ritmo actual entran unos ${entran} negocios más antes de llenar el plan gratuito.`
            : ""}
        </p>
      </header>

      <div className={styles.medidores}>
        <Medidor
          bytes={uso.bytes_totales}
          detalle="fotografías, logos y portadas"
          limite={LIMITE_ARCHIVOS_BYTES}
          titulo="Archivos"
        />
        {/* Los dos techos se llenan por caminos distintos: estar c\u00f3modo en uno
            no dice nada del otro. */}
        <Medidor
          bytes={uso.bytes_base_datos}
          detalle="productos, pedidos y analítica"
          limite={LIMITE_BASE_BYTES}
          titulo="Base de datos"
        />
      </div>

      {uso.archivos_huerfanos > 0 ? (
        <p className={styles.huerfanos}>
          {uso.archivos_huerfanos} archivo(s) sin negocio dueño: sobras de una baja o de un
          borrado a medias. Ocupan espacio y no los ve nadie.
        </p>
      ) : null}

      {uso.negocios.length === 0 ? (
        <p className={styles.vacio}>Todavía no hay negocios cargados.</p>
      ) : (
        <ol className={styles.lista}>
          {uso.negocios.map((negocio) => (
            <li className={styles.fila} key={negocio.negocio_id}>
              <div>
                <strong>{negocio.nombre}</strong>
                <p>
                  /{negocio.slug}
                  {negocio.activo ? "" : " · dado de baja"}
                </p>
              </div>
              <div className={styles.ocupa}>
                <strong>{formatearBytes(negocio.bytes)}</strong>
                <span>{negocio.archivos} archivo(s)</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
