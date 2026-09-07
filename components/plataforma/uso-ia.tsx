import {
  LIMITES_GEMINI,
  NEGOCIOS_CON_HERRAMIENTA,
  TOPE_FOTOS_POR_DIA,
  TOPE_FOTOS_POR_MES,
  faltaParaReinicio,
  nivelDeUsoIa,
  porcentajeDeUso,
  type UsoIa,
} from "../../lib/ia/limites";
import styles from "./uso-ia.module.css";

/* Google no publica cuánto queda del nivel gratuito: la respuesta de la API no
   trae ninguna cabecera de cuota y no hay endpoint que lo diga. Así que estos
   números salen de contar nuestras propias llamadas, y son exactos por un
   motivo concreto: el Worker es el único que usa esa clave.

   Lo único que no ven son las pruebas hechas directamente en AI Studio, que
   consumen la misma cuota del proyecto sin pasar por acá. Está dicho en la
   pantalla para que nadie lo descubra después. */
function Medidor({
  titulo,
  valor,
  limite,
  unidad,
  detalle,
}: {
  titulo: string;
  valor: number;
  limite: number;
  unidad: string;
  detalle?: string;
}) {
  const porcentaje = porcentajeDeUso(valor, limite);
  return (
    <div className={styles.medidor} data-nivel={nivelDeUsoIa(valor, limite)}>
      <span className={styles.titulo}>{titulo}</span>
      <strong>
        {valor.toLocaleString("es-BO")}
        {limite > 0 ? <span> de {limite.toLocaleString("es-BO")}</span> : null}
      </strong>
      {limite > 0 ? (
        <progress className={styles.barra} max={100} value={porcentaje}>
          {porcentaje} % usado
        </progress>
      ) : null}
      <p>
        {unidad}
        {limite > 0 ? ` · ${porcentaje} %` : " · sin límite declarado"}
        {detalle ? ` · ${detalle}` : ""}
      </p>
    </div>
  );
}

function conFecha(valor: string | null): string {
  if (!valor) return "todavía ninguna";
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

export function UsoIaPanel({ uso }: { uso: UsoIa | null }) {
  if (!uso) {
    return (
      <section aria-labelledby="uso-ia" className={styles.panel}>
        <h2 id="uso-ia">Lectura de fotos</h2>
        <p className={styles.vacio}>No se pudo medir el consumo en este momento.</p>
      </section>
    );
  }

  const herramientas = Object.entries(uso.por_herramienta);
  /* Lo que queda del día compartido después de lo ya gastado. Es la cifra que
     dice si entra otro negocio hoy, y no se deduce de ninguna barra. */
  const restanteHoy = Math.max(0, LIMITES_GEMINI.porDia - uso.dia_cuota.llamadas);
  const repartido = TOPE_FOTOS_POR_DIA * NEGOCIOS_CON_HERRAMIENTA;

  return (
    <section aria-labelledby="uso-ia" className={styles.panel}>
      <header>
        <h2 id="uso-ia">Lectura de fotos</h2>
        <p>
          Consumo del nivel gratuito de Google, contado de este lado: su API no dice cuánto
          queda. Es exacto porque el sistema es el único que usa la clave;{" "}
          <strong>no incluye las pruebas que hagas en AI Studio</strong>.
        </p>
      </header>

      <div className={styles.medidores}>
        <Medidor
          limite={LIMITES_GEMINI.porMinuto}
          titulo="Último minuto"
          unidad="pedidos"
          valor={uso.minuto.llamadas}
        />
        <Medidor
          limite={LIMITES_GEMINI.tokensPorMinuto}
          titulo="Tokens del minuto"
          unidad="tokens"
          valor={uso.minuto.tokens}
        />
        {/* El día de cuota se cuenta en hora del Pacífico, que es donde Google
            reinicia. Poner el día boliviano acá haría esperar la medianoche
            equivocada. */}
        <Medidor
          detalle={`vuelve a cero ${faltaParaReinicio(uso.reinicio_dia_cuota)}`}
          limite={LIMITES_GEMINI.porDia}
          titulo="Día de cuota"
          unidad="pedidos"
          valor={uso.dia_cuota.llamadas}
        />
        <Medidor
          limite={0}
          titulo="Última hora"
          unidad="pedidos"
          valor={uso.hora.llamadas}
        />
      </div>

      <dl className={styles.detalles}>
        <div>
          <dt>Queda hoy</dt>
          <dd>{restanteHoy.toLocaleString("es-BO")} pedidos</dd>
        </div>
        <div>
          <dt>Día más cargado</dt>
          <dd>{uso.pico_diario} en 30 días</dd>
        </div>
        <div>
          <dt>Tokens por lectura</dt>
          <dd>{uso.tokens_por_llamada.toLocaleString("es-BO")}</dd>
        </div>
        <div>
          <dt>Última lectura</dt>
          <dd>{conFecha(uso.ultima)}</dd>
        </div>
      </dl>

      <dl className={styles.detalles}>
        <div>
          <dt>Hoy en Bolivia</dt>
          <dd>
            {uso.dia_bolivia.llamadas} · {uso.dia_bolivia.tokens.toLocaleString("es-BO")} tokens
          </dd>
        </div>
        <div>
          <dt>Este mes</dt>
          <dd>
            {uso.mes.llamadas} · {uso.mes.tokens.toLocaleString("es-BO")} tokens
          </dd>
        </div>
        <div>
          <dt>Últimos 30 días</dt>
          <dd>
            {uso.treinta_dias.llamadas} · {uso.treinta_dias.tokens.toLocaleString("es-BO")} tokens
          </dd>
        </div>
        <div>
          <dt>Fallidas</dt>
          <dd>
            {uso.fallidas_hoy} hoy · {uso.fallidas_treinta_dias} en 30 días
          </dd>
        </div>
      </dl>

      <p className={styles.nota}>
        Por herramienta, hoy:{" "}
        {herramientas.length === 0
          ? "todavía ninguna"
          : herramientas
              .map(([nombre, cantidad]) => `${nombre === "lista" ? "listas" : "productos"}: ${cantidad}`)
              .join(" · ")}
      </p>

      {/* Con varios negocios, el número global no alcanza: dice cuánto se gastó,
          no quién lo gastó, que es la pregunta que aparece cuando la cuota se
          termina temprano. */}
      <section aria-labelledby="uso-por-negocio" className={styles.porNegocio}>
        <h3 id="uso-por-negocio">Por negocio</h3>
        <p className={styles.nota}>
          {uso.negocios_habilitados} de {NEGOCIOS_CON_HERRAMIENTA} lugares ocupados. Cada uno
          puede leer {TOPE_FOTOS_POR_DIA} fotos por día y {TOPE_FOTOS_POR_MES} por mes: entre
          los {NEGOCIOS_CON_HERRAMIENTA} suman {repartido} de los {LIMITES_GEMINI.porDia}{" "}
          diarios, y el resto queda de margen.
        </p>
        {uso.por_negocio.length === 0 ? (
          <p className={styles.vacio}>Ningún negocio tiene la herramienta habilitada.</p>
        ) : (
          <div className={styles.tabla}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Negocio</th>
                  <th scope="col">Hoy</th>
                  <th scope="col">Mes</th>
                  <th scope="col">Tokens del mes</th>
                </tr>
              </thead>
              <tbody>
                {uso.por_negocio.map((negocio) => (
                  <tr key={negocio.negocio_id}>
                    <th scope="row">{negocio.nombre}</th>
                    {/* `cantidad_dia` es lo que cuenta el tope; `hoy` es lo que
                        registró el medidor. Difieren cuando una llamada falló y
                        se devolvió el crédito, y ver las dos es lo que permite
                        notarlo. */}
                    <td data-nivel={nivelDeUsoIa(negocio.cantidad_dia, TOPE_FOTOS_POR_DIA)}>
                      {negocio.cantidad_dia} de {TOPE_FOTOS_POR_DIA}
                    </td>
                    <td data-nivel={nivelDeUsoIa(negocio.mes, TOPE_FOTOS_POR_MES)}>
                      {negocio.mes} de {TOPE_FOTOS_POR_MES}
                    </td>
                    <td>{negocio.tokens_mes.toLocaleString("es-BO")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className={styles.nota}>
        Los tres límites del nivel gratuito están escritos a mano en{" "}
        <code>lib/ia/limites.ts</code> porque Google no los expone. Copialos de la pantalla de
        límites de AI Studio si cambian: los topes por negocio se recalculan solos a partir de
        ellos. Medido el {conFecha(uso.medido_en)}.
      </p>
    </section>
  );
}
