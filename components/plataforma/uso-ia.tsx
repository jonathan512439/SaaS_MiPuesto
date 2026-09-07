import {
  LIMITES_GEMINI,
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
          <dt>Hoy en Bolivia</dt>
          <dd>
            {uso.dia_bolivia.llamadas} pedido(s) ·{" "}
            {uso.dia_bolivia.tokens.toLocaleString("es-BO")} tokens
          </dd>
        </div>
        <div>
          <dt>Fallidas del día</dt>
          <dd>{uso.fallidas_hoy}</dd>
        </div>
        <div>
          <dt>Por herramienta, hoy</dt>
          <dd>
            {herramientas.length === 0
              ? "todavía ninguna"
              : herramientas
                  .map(([nombre, cantidad]) =>
                    `${nombre === "lista" ? "listas" : "productos"}: ${cantidad}`,
                  )
                  .join(" · ")}
          </dd>
        </div>
        <div>
          <dt>Última lectura</dt>
          <dd>
            {uso.ultima
              ? new Intl.DateTimeFormat("es-BO", {
                  timeZone: "America/La_Paz",
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(uso.ultima))
              : "todavía ninguna"}
          </dd>
        </div>
      </dl>

      <p className={styles.nota}>
        Los tres límites están escritos a mano en <code>lib/ia/limites.ts</code> porque Google
        no los expone. Copialos de la pantalla de límites de AI Studio si cambian.
      </p>
    </section>
  );
}
