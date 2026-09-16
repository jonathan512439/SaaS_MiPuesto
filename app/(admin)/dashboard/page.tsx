import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  calcularTendencia,
  contarPorProducto,
  describirTendencia,
  MAXIMO_EVENTOS_LEIDOS,
  obtenerVentanasSemanales,
} from "../../../lib/analitica-servidor";
import { faltantesParaPublicar } from "../../../lib/negocios/alta";
import { leerSituacionDelNegocio } from "../../../lib/negocios/situacion";
import { formatearPrecioBolivianos } from "../../../lib/precios";
import { crearClienteSupabaseServidor } from "../../../lib/supabase/server";
import styles from "./resumen.module.css";
import { EncabezadoPanel } from "../../../components/dashboard/encabezado-panel";
import { RUTAS_PANEL, RUTA_SIN_NEGOCIO } from "../../../lib/panel/rutas";

export const metadata: Metadata = {
  title: "Inicio | MiPuesto",
  description: "Qué le falta a tu catálogo y qué pasó con él esta semana.",
};

const METRICAS = [
  {
    tipo: "vista_catalogo",
    etiqueta: "Visitas al catálogo",
    ayuda: "Personas que abrieron tu enlace.",
  },
  {
    tipo: "clic_producto",
    etiqueta: "Productos agregados",
    ayuda: "Veces que alguien sumó algo al pedido.",
  },
  {
    tipo: "clic_whatsapp",
    etiqueta: "Salidas a WhatsApp",
    ayuda: "Conversaciones que empezaron desde el catálogo.",
  },
] as const;

export default async function PaginaDashboard() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login?motivo=sesion");

  const leido = await leerSituacionDelNegocio(supabase, idUsuario);
  if (!leido) redirect(RUTA_SIN_NEGOCIO);
  const { negocio } = leido;

  /* Lo que le falta al catálogo para servir, en la primera pantalla y no
     escondido en el alta.
     El alta se recorre una vez; esto **vive para siempre**. Un negocio que
     terminó el alta hace seis meses y borró su teléfono tiene que enterarse acá,
     que es donde entra todos los días, y no descubrirlo porque dejó de recibir
     pedidos. */
  const faltantes = faltantesParaPublicar(leido.situacion);
  const impiden = faltantes.filter(({ impide }) => impide);

  const { actual, previa } = obtenerVentanasSemanales();

  /* Las dos semanas se piden juntas: un número suelto no dice si está bien.
     «240 visitas» no significa nada; «240, un 30 % más» sí. */
  const [conteosActuales, conteosPrevios, eventosProducto, pedidosSemana] =
    await Promise.all([
      Promise.all(
        METRICAS.map(({ tipo }) =>
          supabase
            .from("eventos_analitica")
            .select("id", { count: "exact", head: true })
            .eq("negocio_id", negocio.id)
            .eq("tipo", tipo)
            .gte("creado_en", actual.desde),
        ),
      ),
      Promise.all(
        METRICAS.map(({ tipo }) =>
          supabase
            .from("eventos_analitica")
            .select("id", { count: "exact", head: true })
            .eq("negocio_id", negocio.id)
            .eq("tipo", tipo)
            .gte("creado_en", previa.desde)
            .lt("creado_en", previa.hasta),
        ),
      ),
      supabase
        .from("eventos_analitica")
        .select("producto_id")
        .eq("negocio_id", negocio.id)
        .eq("tipo", "clic_producto")
        .gte("creado_en", actual.desde)
        .limit(MAXIMO_EVENTOS_LEIDOS),
      supabase
        .from("pedidos")
        .select("id,total,estado")
        .eq("negocio_id", negocio.id)
        .gte("creado_en", actual.desde),
    ]);

  if (
    conteosActuales.some(({ error }) => error) ||
    conteosPrevios.some(({ error }) => error) ||
    eventosProducto.error ||
    pedidosSemana.error
  ) {
    throw new Error("No se pudo cargar el reporte semanal.");
  }

  const masVistos = contarPorProducto(eventosProducto.data ?? []);
  const { data: productosVistos } = masVistos.length
    ? await supabase
        .from("productos")
        .select("id,nombre")
        .eq("negocio_id", negocio.id)
        .is("eliminado_en", null)
        .in(
          "id",
          masVistos.map(({ productoId }) => productoId),
        )
    : { data: [] };

  const nombrePorId = new Map((productosVistos ?? []).map(({ id, nombre }) => [id, nombre]));
  const pedidos = pedidosSemana.data ?? [];
  const totalPedidos = pedidos.reduce((suma, pedido) => suma + Number(pedido.total), 0);
  const entregados = pedidos.filter((pedido) => pedido.estado === "entregado").length;

  return (
    <main className={styles.contenido}>
      <EncabezadoPanel
        descripcion="Sin nombres, teléfonos ni contenido de los pedidos."
        rotulo="Últimos 7 días"
        titulo={negocio.nombre}
      />

      {/* Va arriba de todo y solo cuando falta algo. Un recuadro de «está todo
          listo» en cada visita es ruido, y peor: enseña a saltearlo, de modo que
          el día que sí dice algo tampoco se lee.

          Lo que impide se separa de lo que no. Sin teléfono el catálogo no
          recibe un solo pedido; sin logo, se ve peor y vende igual. Mezclarlos
          en una lista sola haría que el dueño trate a los dos como iguales: o se
          alarma por el logo, o desatiende el teléfono. */}
      {faltantes.length > 0 ? (
        <section
          aria-labelledby="falta-publicar"
          className={styles.faltantes}
          data-impide={impiden.length > 0 ? "si" : undefined}
        >
          <h2 id="falta-publicar">
            {impiden.length > 0
              ? "Esto le falta a tu catálogo para funcionar"
              : "Con esto tu catálogo se vería mejor"}
          </h2>
          <ul>
            {faltantes.map(({ clave, impide, ruta, titulo }) => (
              <li data-impide={impide ? "si" : undefined} key={clave}>
                {/* El enlace es la tarea. Decirle «te falta el WhatsApp» sin
                    llevarlo a cargarlo es una queja, no algo que pueda resolver. */}
                <Link href={ruta}>{titulo}</Link>
                {impide ? null : <small>Opcional</small>}
              </li>
            ))}
          </ul>
          {impiden.length > 0 ? (
            <p>
              Mientras falte algo de esto, quien abra tu catálogo no va a poder hacerte un
              pedido.
            </p>
          ) : null}
        </section>
      ) : null}

      {!negocio.activo ? (
        <aside className={styles.inactivo} role="status">
          <strong>Tu catálogo está temporalmente inactivo.</strong>
          <span>Conservas el acceso a tus datos, pero el enlace no aparece en el directorio.</span>
        </aside>
      ) : null}

      <section aria-labelledby="actividad-semanal" className={styles.actividad}>
        <div className={styles.tituloSeccion}>
          <h2 id="actividad-semanal">Actividad pública</h2>
          <Link href={`/${negocio.slug}`} rel="noreferrer" target="_blank">
            Ver catálogo
          </Link>
        </div>
        <dl className={styles.metricas}>
          {METRICAS.map((metrica, indice) => {
            const total = conteosActuales[indice].count ?? 0;
            const tendencia = calcularTendencia(total, conteosPrevios[indice].count ?? 0);
            return (
              <div data-sentido={tendencia.sentido} key={metrica.tipo}>
                <dt>{metrica.etiqueta}</dt>
                <dd>{total}</dd>
                <p className={styles.tendencia}>{describirTendencia(tendencia)}</p>
                <p className={styles.ayudaMetrica}>{metrica.ayuda}</p>
              </div>
            );
          })}
        </dl>
      </section>

      <section aria-labelledby="pedidos-semana" className={styles.actividad}>
        <div className={styles.tituloSeccion}>
          <h2 id="pedidos-semana">Pedidos de la semana</h2>
          <Link href={RUTAS_PANEL.pedidos}>Revisar pedidos</Link>
        </div>
        <dl className={styles.metricas}>
          <div>
            <dt>Pedidos recibidos</dt>
            <dd>{pedidos.length}</dd>
            <p className={styles.ayudaMetrica}>{entregados} entregado(s).</p>
          </div>
          <div>
            <dt>Suma de esos pedidos</dt>
            <dd className={styles.monto}>{formatearPrecioBolivianos(totalPedidos)}</dd>
            <p className={styles.ayudaMetrica}>
              Lo reservado, no necesariamente lo cobrado.
            </p>
          </div>
        </dl>
      </section>

      <section aria-labelledby="mas-vistos" className={styles.actividad}>
        <div className={styles.tituloSeccion}>
          <h2 id="mas-vistos">Lo que más agregan</h2>
          <Link href={RUTAS_PANEL.productos}>Administrar productos</Link>
        </div>
        {masVistos.length === 0 ? (
          <p className={styles.sinDatos}>
            Todavía no hay suficiente actividad esta semana para ordenar tus productos.
          </p>
        ) : (
          <ol className={styles.ranking}>
            {masVistos.map(({ productoId, total }) => (
              <li key={productoId}>
                <span>{nombrePorId.get(productoId) ?? "Producto retirado"}</span>
                <strong>{total}</strong>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="siguientes-pasos" className={styles.acciones}>
        <h2 id="siguientes-pasos">Accesos rápidos</h2>
        <div>
          <Link href={RUTAS_PANEL.productos}>Administrar productos</Link>
          <Link href={RUTAS_PANEL.pedidos}>Revisar pedidos</Link>
          <Link href={RUTAS_PANEL.negocio}>Compartir el QR</Link>
        </div>
      </section>
    </main>
  );
}
