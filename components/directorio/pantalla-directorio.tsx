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
import { nombreDeCiudad } from "../../lib/negocios/lugares";
import { nombreDeRubroPublico } from "../../lib/negocios/rubros-publicos";
import { rutaProductoPublico } from "../../lib/url-sitio";
import { PieSitio } from "../sitio/pie-sitio";
import { CercaDeMi } from "./cerca-de-mi";
import styles from "../../app/directorio/directorio.module.css";

/* El directorio, con buscador y filtros. Fase 12.
 *
 * Una sola pantalla para las tres direcciones —`/directorio`,
 * `/directorio/oruro` y `/directorio/oruro/restaurante`—: cambian el título y
 * lo que viene fijo, no lo que se dibuja.
 *
 * **El formulario es un `GET` común.** Funciona sin JavaScript, la búsqueda
 * queda en la dirección —se comparte por WhatsApp, el botón «atrás» funciona— y
 * lo único que corre en el navegador es «Cerca de mí», que necesita la
 * ubicación.
 *
 * **Sin resultados, nunca una pantalla vacía**: se dice qué no se encontró y se
 * ofrece lo que sí hay en esa ciudad. Y al pie, a quien tiene un negocio que
 * vende eso, la invitación a sumarse: es el embudo de la portada al revés.
 */
export async function PantallaDirectorio({
  filtros,
  titulo,
  bajada,
}: {
  filtros: FiltrosDirectorio;
  titulo: string;
  bajada: string;
}) {
  const facetas = await facetasDelDirectorio(filtros.ciudad);

  /* Una zona de otra ciudad —la que quedó elegida antes de cambiar de ciudad
     sin JavaScript— no filtra: daría cero sin explicar por qué. */
  const filtrosValidos: FiltrosDirectorio = {
    ...filtros,
    zonaId: facetas.zonas.some(({ id }) => id === filtros.zonaId) ? filtros.zonaId : null,
  };

  const busqueda = await buscarEnDirectorio(filtrosValidos);
  const huboTexto = busqueda.palabras.length > 0;

  /* Sin resultados con texto: se anota qué se buscó, y se busca lo mismo sin el
     texto para ofrecer lo que sí hay. */
  let alternativa: ResultadoDirectorio[] = [];
  if (busqueda.total === 0 && huboTexto) {
    await registrarBusquedaSinResultado(busqueda.palabras, filtrosValidos.ciudad);
    const sinTexto = await buscarEnDirectorio({ ...filtrosValidos, texto: "", zonaId: null, rubro: null, pagina: 1 });
    alternativa = sinTexto.resultados.slice(0, 6);
  }

  const lugar = filtrosValidos.ciudad ? nombreDeCiudad(filtrosValidos.ciudad) : "MiPuesto";

  return (
    <>
      <main className={styles.pagina}>
        <header className={styles.cabecera}>
          <Link className={styles.marca} href="/">
            MiPuesto
          </Link>
          <p>Encontrá lo que buscás cerca tuyo</p>
          <h1>{titulo}</h1>
          <p>{bajada}</p>
        </header>

        <form action="/directorio" className={styles.buscador} method="get" role="search">
          <label className={styles.campoBusqueda} htmlFor="directorio-q">
            <span>¿Qué buscás?</span>
            <input
              autoComplete="off"
              defaultValue={filtrosValidos.texto}
              id="directorio-q"
              maxLength={60}
              name="q"
              placeholder="Juguetes, almuerzo, zapatillas…"
              type="search"
            />
          </label>
          <div className={styles.filtros}>
            <label htmlFor="directorio-ciudad">
              <span>Ciudad</span>
              <select defaultValue={filtrosValidos.ciudad ?? ""} id="directorio-ciudad" name="ciudad">
                <option value="">Todas</option>
                {facetas.ciudades.map(({ id, nombre }) => (
                  <option key={id} value={id}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>
            {facetas.zonas.length > 0 ? (
              <label htmlFor="directorio-zona">
                <span>Zona</span>
                <select defaultValue={filtrosValidos.zonaId ?? ""} id="directorio-zona" name="zona">
                  <option value="">Todas</option>
                  {facetas.zonas.map(({ id, nombre }) => (
                    <option key={id} value={id}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {facetas.rubros.length > 0 ? (
              <label htmlFor="directorio-rubro">
                <span>Rubro</span>
                <select defaultValue={filtrosValidos.rubro ?? ""} id="directorio-rubro" name="rubro">
                  <option value="">Todos</option>
                  {facetas.rubros.map(({ id, nombre }) => (
                    <option key={id} value={id}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          {filtrosValidos.cerca ? (
            <input name="cerca" type="hidden" value={`${filtrosValidos.cerca.lat},${filtrosValidos.cerca.lng}`} />
          ) : null}
          <div className={styles.accionesBuscador}>
            <button className={styles.botonBuscar} type="submit">
              Buscar
            </button>
            {filtrosValidos.cerca ? (
              <Link className={styles.quitarCerca} href={direccionDeBusqueda({ ...filtrosValidos, cerca: null, pagina: 1 })}>
                Ordenado por cercanía. Quitar
              </Link>
            ) : (
              <CercaDeMi direccionSinCerca={direccionDeBusqueda({ ...filtrosValidos, pagina: 1 })} />
            )}
          </div>
        </form>

        {/* Las ciudades como enlaces a su página: son las direcciones que
            encuentra Google, y un atajo para quien no quiere abrir el
            desplegable. */}
        {facetas.ciudades.length > 1 && !filtrosValidos.ciudad ? (
          <nav aria-label="Ciudades con negocios" className={styles.ciudades}>
            {facetas.ciudades.map(({ id, nombre }) => (
              <Link className={styles.ciudad} href={`/directorio/${id}`} key={id}>
                {nombre}
              </Link>
            ))}
          </nav>
        ) : null}

        {busqueda.total > 0 ? (
          <section aria-label="Resultados" className={styles.resultados}>
            <p className={styles.conteo} aria-live="polite">
              {busqueda.total === 1 ? "1 negocio" : `${busqueda.total} negocios`}
              {huboTexto ? ` con «${filtrosValidos.texto}»` : ""}
              {filtrosValidos.ciudad ? ` en ${lugar}` : ""}
            </p>
            <ListaDeNegocios negocios={busqueda.resultados} />
            {busqueda.totalPaginas > 1 ? (
              <nav aria-label="Páginas de resultados" className={styles.paginacion}>
                {filtrosValidos.pagina > 1 ? (
                  <Link href={direccionDeBusqueda({ ...filtrosValidos, pagina: filtrosValidos.pagina - 1 })}>
                    Anterior
                  </Link>
                ) : (
                  <span />
                )}
                <p>
                  Página {filtrosValidos.pagina} de {busqueda.totalPaginas}
                </p>
                {filtrosValidos.pagina < busqueda.totalPaginas ? (
                  <Link href={direccionDeBusqueda({ ...filtrosValidos, pagina: filtrosValidos.pagina + 1 })}>
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
            <h2>
              {huboTexto
                ? `No encontramos «${filtrosValidos.texto}»${filtrosValidos.ciudad ? ` en ${lugar}` : ""}`
                : `Todavía no hay negocios${filtrosValidos.ciudad ? ` en ${lugar}` : ""} con estos filtros`}
            </h2>
            {alternativa.length > 0 ? (
              <>
                <p>Estos negocios{filtrosValidos.ciudad ? ` de ${lugar}` : ""} sí están:</p>
                <ListaDeNegocios negocios={alternativa} />
              </>
            ) : (
              <Link href="/directorio">Ver todo el directorio</Link>
            )}
          </section>
        )}

        <aside className={styles.sumate}>
          <p>
            <strong>¿Tenés un negocio{huboTexto ? " que vende esto" : ""}?</strong> Sumalo a MiPuesto y
            que te encuentren acá.
          </p>
          <Link href="/">Conocé MiPuesto</Link>
        </aside>
      </main>
      <PieSitio />
    </>
  );
}

/* Las tarjetas de los negocios. Sin un enlace que envuelva la tarjeta entera:
   adentro hay enlaces a productos, y un enlace dentro de otro no es válido. */
function ListaDeNegocios({ negocios }: { negocios: ResultadoDirectorio[] }) {
  return (
    <ul className={styles.rejilla}>
      {negocios.map((negocio) => {
        const alCatalogo = negocio.palabra
          ? `/${negocio.slug}?buscar=${encodeURIComponent(negocio.palabra)}`
          : `/${negocio.slug}`;
        return (
          <li key={negocio.id}>
            <article className={styles.tarjeta}>
              <div className={styles.imagen}>
                {negocio.portadaUrl ? (
                  <Image
                    alt=""
                    fill
                    sizes="(min-width: 64rem) 30vw, (min-width: 40rem) 50vw, 100vw"
                    src={negocio.portadaUrl}
                  />
                ) : (
                  <span aria-hidden="true">{negocio.nombre.slice(0, 1)}</span>
                )}
              </div>
              <div className={styles.identidad}>
                {negocio.logoUrl ? <Image alt="" height={64} src={negocio.logoUrl} width={64} /> : null}
                <div>
                  {negocio.rubro ? <p>{negocio.rubro}</p> : null}
                  <h2>
                    <Link href={alCatalogo}>{negocio.nombre}</Link>
                  </h2>
                </div>
              </div>
              <p className={styles.zona}>
                {[negocio.zona, nombreDeCiudad(negocio.ciudad)].filter(Boolean).join(", ")}
                {negocio.distanciaKm !== null ? `. A ${formatearDistancia(negocio.distanciaKm)}` : ""}
              </p>
              {negocio.descripcion ? <p className={styles.descripcion}>{negocio.descripcion}</p> : null}
              {negocio.estadoAtencion.texto ? (
                <span className={negocio.estadoAtencion.abierto ? styles.abierto : styles.cerrado}>
                  {negocio.estadoAtencion.texto}
                </span>
              ) : null}

              {negocio.productos.length > 0 ? (
                <div className={styles.coincidencias}>
                  <p>
                    {negocio.coincidencias === 1
                      ? "1 producto coincide"
                      : `${negocio.coincidencias} productos coinciden`}
                  </p>
                  <ul>
                    {negocio.productos.map((producto) => (
                      <li key={producto.codigo}>
                        <Link href={rutaProductoPublico(negocio.slug, producto.codigo)}>
                          {producto.fotoUrl ? (
                            <Image alt="" height={56} src={producto.fotoUrl} width={56} />
                          ) : (
                            <span aria-hidden="true" className={styles.sinFoto} />
                          )}
                          <span>{producto.nombre}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Link className={styles.verCatalogo} href={alCatalogo}>
                {negocio.palabra ? `Ver ${negocio.palabra} en su catálogo` : "Ver catálogo"}
              </Link>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

/* «A 1,5 km», «a menos de 1 km». La base ya la redondeó a medio kilómetro. */
function formatearDistancia(km: number): string {
  if (km < 1) return "menos de 1 km";
  return `${km.toLocaleString("es-BO", { maximumFractionDigits: 1 })} km`;
}

/* Para las páginas por ciudad y rubro: «Restaurante en Oruro». */
export function tituloDeDirectorio(filtros: Pick<FiltrosDirectorio, "ciudad" | "rubro">): string {
  const rubro = nombreDeRubroPublico(filtros.rubro);
  if (rubro && filtros.ciudad) return `${rubro} en ${nombreDeCiudad(filtros.ciudad)}`;
  if (rubro) return `${rubro} en Bolivia`;
  if (filtros.ciudad) return `Negocios en ${nombreDeCiudad(filtros.ciudad)}`;
  return "Negocios locales en un solo lugar";
}
