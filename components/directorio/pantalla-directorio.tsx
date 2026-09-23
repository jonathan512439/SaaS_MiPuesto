import Image from "next/image";
import Link from "next/link";

import {
  buscarEnDirectorio,
  direccionDeBusqueda,
  facetasDelDirectorio,
  type FiltrosDirectorio,
  type ResultadoDirectorio,
} from "../../lib/directorio";
import { registrarBusquedaSinResultado } from "../../lib/directorio-servidor";
import { construirEnlaceContacto } from "../../lib/contacto";
import { nombreDeCiudad } from "../../lib/negocios/lugares";
import {
  esRubroPublicoId,
  nombreDeRubroPublico,
} from "../../lib/negocios/rubros-publicos";
import { rutaProductoPublico } from "../../lib/url-sitio";
import { IconoCatalogo } from "../iconos/icono-catalogo";
import { CabeceraSitio } from "../sitio/cabecera-sitio";
import { PieSitio } from "../sitio/pie-sitio";
import { BuscadorVivo } from "./buscador-vivo";
import { CercaDeMi } from "./cerca-de-mi";
import { FiltrosDelDirectorio } from "./filtros-directorio";
import {
  BUSQUEDAS_POPULARES,
  EJEMPLOS_DE_BUSQUEDA,
  ICONO_DE_RUBRO,
} from "./iconos-rubro";
import styles from "./pantalla-directorio.module.css";

/* El directorio: una feria que se recorre buscando.
 *
 * Arriba, la noche con el buscador grande y lo más buscado en baldosas: se
 * entiende qué se puede hacer sin leer una explicación. Debajo, las ciudades
 * como pestañas, los filtros que se aplican solos, y los negocios como
 * puestos: la foto, el logo, si está abierto, y los productos que coinciden con
 * lo que se buscó.
 *
 * Todo funciona sin JavaScript —el buscador y los filtros son formularios
 * `GET`, y la búsqueda queda en la dirección para mandarla por WhatsApp—; con
 * JavaScript, el buscador sugiere mientras se escribe y los filtros no
 * necesitan botón.
 *
 * Sin resultados, nunca una pantalla vacía: se dice qué no se encontró, se
 * ofrece lo que sí hay en esa ciudad, y al que tiene un negocio que vende eso se
 * lo invita a sumarse.
 */
export async function PantallaDirectorio({
  filtros,
  titulo,
  bajada,
  ruta,
  rubroEnRuta = false,
}: {
  filtros: FiltrosDirectorio;
  titulo: string;
  bajada: string;
  /* La dirección de esta página: `/directorio`, `/directorio/oruro` o
     `/directorio/oruro/restaurante`. Los filtros vuelven acá. */
  ruta: string;
  /* Si el rubro viene en la dirección y no hay que ofrecerlo como filtro. */
  rubroEnRuta?: boolean;
}) {
  const facetas = await facetasDelDirectorio(filtros.ciudad);

  /* Una zona de otra ciudad no filtra: daría cero sin explicar por qué. */
  const filtrosValidos: FiltrosDirectorio = {
    ...filtros,
    zonaId: facetas.zonas.some(({ id }) => id === filtros.zonaId)
      ? filtros.zonaId
      : null,
  };

  const busqueda = await buscarEnDirectorio(filtrosValidos);
  const huboTexto = busqueda.palabras.length > 0;

  let alternativa: ResultadoDirectorio[] = [];
  if (busqueda.total === 0 && huboTexto) {
    await registrarBusquedaSinResultado(
      busqueda.palabras,
      filtrosValidos.ciudad,
    );
    const sinTexto = await buscarEnDirectorio({
      ...filtrosValidos,
      texto: "",
      zonaId: null,
      rubro: null,
      pagina: 1,
    });
    alternativa = sinTexto.resultados.slice(0, 6);
  }

  const lugar = filtrosValidos.ciudad
    ? nombreDeCiudad(filtrosValidos.ciudad)
    : null;
  const enCiudad = (extra: string) =>
    filtrosValidos.ciudad ? `${extra}&ciudad=${filtrosValidos.ciudad}` : extra;
  const cercaTexto = filtrosValidos.cerca
    ? `${filtrosValidos.cerca.lat},${filtrosValidos.cerca.lng}`
    : null;
  const mostrarRubros =
    !huboTexto && !filtrosValidos.rubro && facetas.rubros.length > 1;

  return (
    <>
      <CabeceraSitio actual="directorio" />
      <main className={styles.pagina}>
        {/* ── La noche: la pregunta y el buscador ── */}
        <section className={styles.portada}>
          <div className={styles.portadaContenido}>
            <p className={styles.bajada}>{bajada}</p>
            <h1>{titulo}</h1>
            <BuscadorVivo
              campoOculto={cercaTexto ? { cerca: cercaTexto } : undefined}
              ciudad={filtrosValidos.ciudad}
              ejemplos={EJEMPLOS_DE_BUSQUEDA}
              valorInicial={filtrosValidos.texto}
            />
            <ul aria-label="Lo más buscado" className={styles.populares}>
              {BUSQUEDAS_POPULARES.map(({ texto, icono }) => (
                <li key={texto}>
                  <Link
                    href={enCiudad(
                      `/directorio?q=${encodeURIComponent(texto.toLowerCase())}`,
                    )}
                  >
                    <IconoCatalogo nombre={icono} />
                    {texto}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div aria-hidden="true" className={styles.cinta} />
        </section>

        <div className={styles.cuerpo}>
          {/* ── Las ciudades, como pestañas ── */}
          {facetas.ciudades.length > 0 ? (
            <nav aria-label="Ciudades" className={styles.ciudades}>
              <Link
                aria-current={!filtrosValidos.ciudad ? "page" : undefined}
                className={styles.ciudad}
                href={
                  huboTexto
                    ? direccionDeBusqueda({ texto: filtrosValidos.texto })
                    : "/directorio"
                }
              >
                Todas
              </Link>
              {facetas.ciudades.map(({ id, nombre }) => (
                <Link
                  aria-current={
                    filtrosValidos.ciudad === id ? "page" : undefined
                  }
                  className={styles.ciudad}
                  href={
                    huboTexto
                      ? direccionDeBusqueda({
                          texto: filtrosValidos.texto,
                          ciudad: id,
                        })
                      : `/directorio/${id}`
                  }
                  key={id}
                >
                  {nombre}
                </Link>
              ))}
            </nav>
          ) : null}

          <div className={styles.barra}>
            <FiltrosDelDirectorio
              accion={ruta}
              cerca={cercaTexto}
              rubroElegido={filtrosValidos.rubro}
              rubroFijo={rubroEnRuta}
              rubros={facetas.rubros}
              texto={filtrosValidos.texto}
              zonaElegida={filtrosValidos.zonaId}
              zonas={facetas.zonas}
            />
            {filtrosValidos.cerca ? (
              <Link
                className={styles.quitarCerca}
                href={direccionDeBusqueda({
                  ...filtrosValidos,
                  cerca: null,
                  pagina: 1,
                })}
              >
                Ordenado por cercanía. Quitar
              </Link>
            ) : (
              <CercaDeMi
                direccionSinCerca={direccionDeBusqueda({
                  ...filtrosValidos,
                  pagina: 1,
                })}
              />
            )}
          </div>

          {/* ── Los rubros, como baldosas: se elige mirando ── */}
          {mostrarRubros ? (
            <section aria-labelledby="por-rubro" className={styles.rubros}>
              <h2 id="por-rubro">Por rubro{lugar ? ` en ${lugar}` : ""}</h2>
              <ul>
                {facetas.rubros.map(({ id, nombre }) => (
                  <li key={id}>
                    <Link
                      href={
                        filtrosValidos.ciudad
                          ? `/directorio/${filtrosValidos.ciudad}/${id}`
                          : `/directorio?rubro=${id}`
                      }
                    >
                      <span className={styles.baldosaIcono}>
                        <IconoCatalogo
                          nombre={
                            esRubroPublicoId(id)
                              ? ICONO_DE_RUBRO[id]
                              : "caja-general"
                          }
                        />
                      </span>
                      {nombre}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {busqueda.total > 0 ? (
            <section aria-label="Resultados" className={styles.resultados}>
              <p aria-live="polite" className={styles.conteo}>
                <strong>
                  {busqueda.total === 1
                    ? "1 negocio"
                    : `${busqueda.total} negocios`}
                </strong>
                {huboTexto ? ` con «${filtrosValidos.texto}»` : ""}
                {lugar ? ` en ${lugar}` : ""}
              </p>
              <Puestos negocios={busqueda.resultados} />
              {busqueda.totalPaginas > 1 ? (
                <nav
                  aria-label="Páginas de resultados"
                  className={styles.paginacion}
                >
                  {filtrosValidos.pagina > 1 ? (
                    <Link
                      href={direccionDeBusqueda({
                        ...filtrosValidos,
                        pagina: filtrosValidos.pagina - 1,
                      })}
                    >
                      Anterior
                    </Link>
                  ) : (
                    <span />
                  )}
                  <p>
                    {filtrosValidos.pagina} de {busqueda.totalPaginas}
                  </p>
                  {filtrosValidos.pagina < busqueda.totalPaginas ? (
                    <Link
                      href={direccionDeBusqueda({
                        ...filtrosValidos,
                        pagina: filtrosValidos.pagina + 1,
                      })}
                    >
                      Siguiente
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              ) : null}
            </section>
          ) : (
            <section className={styles.vacio}>
              <span aria-hidden="true" className={styles.vacioIcono}>
                <IconoCatalogo nombre="buscar" />
              </span>
              <h2>
                {huboTexto
                  ? `No encontramos «${filtrosValidos.texto}»${lugar ? ` en ${lugar}` : ""}`
                  : `Todavía no hay negocios${lugar ? ` en ${lugar}` : ""} con estos filtros`}
              </h2>
              {alternativa.length > 0 ? (
                <>
                  <p>Estos {lugar ? `de ${lugar} ` : ""}sí están:</p>
                  <Puestos negocios={alternativa} />
                </>
              ) : (
                <Link className={styles.botonClaro} href="/directorio">
                  Ver todo el directorio
                </Link>
              )}
            </section>
          )}
        </div>

        {/* ── Al pie: el embudo de la portada, visto desde el comprador ── */}
        <section className={styles.sumate}>
          <div className={styles.sumateContenido}>
            <div>
              <h2>¿Tenés un negocio{huboTexto ? " que vende esto" : ""}?</h2>
              <p>Que te encuentren acá. El primer mes es gratis.</p>
            </div>
            <div className={styles.sumateAcciones}>
              <a
                className={styles.botonNoche}
                href={construirEnlaceContacto(
                  "Hola, quiero que mi negocio aparezca en MiPuesto.",
                )}
                rel="noreferrer"
                target="_blank"
              >
                Quiero aparecer
              </a>
              <Link className={styles.enlaceNoche} href="/">
                Conocé MiPuesto
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PieSitio />
    </>
  );
}

/* Los negocios, como puestos de feria: la foto arriba, el logo encima, si está
   abierto, y lo que tiene de lo que se buscó. Sin un enlace que envuelva todo:
   adentro hay enlaces a productos. */
function Puestos({ negocios }: { negocios: ResultadoDirectorio[] }) {
  return (
    <ul className={styles.puestos}>
      {negocios.map((negocio) => {
        const alCatalogo = negocio.palabra
          ? `/${negocio.slug}?buscar=${encodeURIComponent(negocio.palabra)}`
          : `/${negocio.slug}`;
        return (
          <li key={negocio.id}>
            <article className={styles.puesto}>
              <Link
                aria-hidden="true"
                className={styles.foto}
                href={alCatalogo}
                tabIndex={-1}
              >
                {negocio.portadaUrl ? (
                  <Image
                    alt=""
                    fill
                    sizes="(min-width: 64rem) 30vw, (min-width: 40rem) 50vw, 100vw"
                    src={negocio.portadaUrl}
                  />
                ) : (
                  <span className={styles.fotoVacia} />
                )}
                {negocio.estadoAtencion.texto ? (
                  <span
                    className={
                      negocio.estadoAtencion.abierto
                        ? styles.abierto
                        : styles.cerrado
                    }
                  >
                    {negocio.estadoAtencion.abierto ? "Abierto" : "Cerrado"}
                  </span>
                ) : null}
                {negocio.distanciaKm !== null ? (
                  <span className={styles.distancia}>
                    {negocio.distanciaKm < 1
                      ? "A menos de 1 km"
                      : `A ${negocio.distanciaKm.toLocaleString("es-BO", { maximumFractionDigits: 1 })} km`}
                  </span>
                ) : null}
              </Link>
              <div className={styles.puestoCuerpo}>
                {negocio.logoUrl ? (
                  <Image
                    alt=""
                    className={styles.logo}
                    height={64}
                    src={negocio.logoUrl}
                    width={64}
                  />
                ) : (
                  <span aria-hidden="true" className={styles.logoVacio}>
                    {negocio.nombre.slice(0, 1)}
                  </span>
                )}
                <h3>
                  <Link href={alCatalogo}>{negocio.nombre}</Link>
                </h3>
                <p className={styles.donde}>
                  {[negocio.rubro, negocio.zona, nombreDeCiudad(negocio.ciudad)]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {negocio.productos.length > 0 ? (
                  <ul
                    aria-label="Productos que coinciden"
                    className={styles.productos}
                  >
                    {negocio.productos.map((producto) => (
                      <li key={producto.codigo}>
                        <Link
                          href={rutaProductoPublico(
                            negocio.slug,
                            producto.codigo,
                          )}
                        >
                          {producto.fotoUrl ? (
                            <Image
                              alt=""
                              height={72}
                              src={producto.fotoUrl}
                              width={72}
                            />
                          ) : (
                            <span className={styles.productoVacio} />
                          )}
                          <span>{producto.nombre}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : negocio.descripcion ? (
                  <p className={styles.descripcion}>{negocio.descripcion}</p>
                ) : null}
                <Link className={styles.verCatalogo} href={alCatalogo}>
                  {negocio.palabra
                    ? negocio.coincidencias > 1
                      ? `Ver sus ${negocio.coincidencias} productos`
                      : "Ver en su catálogo"
                    : "Ver catálogo"}
                </Link>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

/* Para las páginas por ciudad y rubro: «Restaurante en Oruro». */
export function tituloDeDirectorio(
  filtros: Pick<FiltrosDirectorio, "ciudad" | "rubro">,
): string {
  const rubro = nombreDeRubroPublico(filtros.rubro);
  if (rubro && filtros.ciudad)
    return `${rubro} en ${nombreDeCiudad(filtros.ciudad)}`;
  if (rubro) return `${rubro} en Bolivia`;
  if (filtros.ciudad)
    return `¿Qué buscás en ${nombreDeCiudad(filtros.ciudad)}?`;
  return "¿Qué buscás hoy?";
}
