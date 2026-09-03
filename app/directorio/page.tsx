import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { obtenerDirectorio } from "../../lib/directorio";
import styles from "./directorio.module.css";

export const metadata: Metadata = {
  title: "Directorio de negocios | MiPuesto",
  description: "Encuentra catálogos de negocios locales activos en MiPuesto.",
};

export const dynamic = "force-dynamic";

const TIPOS: Record<string, string> = {
  catalogo_estatico: "Catálogo informativo",
  catalogo_cta: "Pedidos o reservas por WhatsApp",
  tienda_virtual: "Tienda con pedido",
};

type PropiedadesDirectorio = {
  searchParams: Promise<{ pagina?: string | string[] }>;
};

export default async function PaginaDirectorio({ searchParams }: PropiedadesDirectorio) {
  const parametros = await searchParams;
  const paginaPedida = Array.isArray(parametros.pagina) ? parametros.pagina[0] : parametros.pagina;
  const pagina = Number(paginaPedida ?? 1);
  const directorio = await obtenerDirectorio(pagina);

  return (
    <main className={styles.pagina}>
      <header className={styles.cabecera}>
        <Link className={styles.marca} href="/">MiPuesto</Link>
        <p>Compra y reserva cerca de ti</p>
        <h1>Negocios locales en un solo lugar</h1>
        <p>Explora catálogos activos y comunícate directamente con cada negocio.</p>
      </header>

      {directorio.negocios.length > 0 ? (
        <section aria-label="Negocios disponibles" className={styles.resultados}>
          <p className={styles.conteo}>
            {directorio.total === 1 ? "1 negocio disponible" : `${directorio.total} negocios disponibles`}
          </p>
          <ul className={styles.rejilla}>
            {directorio.negocios.map((negocio) => (
              <li key={negocio.id}>
                <Link className={styles.tarjeta} href={`/${negocio.slug}`}>
                  <div className={styles.imagen}>
                    {negocio.portadaUrl ? (
                      <Image alt="" fill sizes="(min-width: 64rem) 30vw, (min-width: 40rem) 50vw, 100vw" src={negocio.portadaUrl} />
                    ) : (
                      <span aria-hidden="true">M</span>
                    )}
                  </div>
                  <div className={styles.identidad}>
                    {negocio.logoUrl ? (
                      <Image alt="" height={64} src={negocio.logoUrl} width={64} />
                    ) : null}
                    <div>
                      <p>{TIPOS[negocio.tipo] ?? "Negocio local"}</p>
                      <h2>{negocio.nombre}</h2>
                    </div>
                  </div>
                  <p className={styles.descripcion}>{negocio.descripcion}</p>
                  {negocio.estadoAtencion.texto ? (
                    <span
                      className={negocio.estadoAtencion.abierto ? styles.abierto : styles.cerrado}
                    >
                      {negocio.estadoAtencion.texto}
                    </span>
                  ) : null}
                  <strong>Ver catálogo</strong>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className={styles.vacio}>
          <h2>Aún no hay negocios en esta página</h2>
          <p>Vuelve a la primera página para seguir explorando.</p>
          <Link href="/directorio">Ir al inicio del directorio</Link>
        </section>
      )}

      {directorio.totalPaginas > 1 ? (
        <nav aria-label="Páginas del directorio" className={styles.paginacion}>
          {directorio.pagina > 1 ? <Link href={`/directorio?pagina=${directorio.pagina - 1}`}>Anterior</Link> : <span />}
          <p>Página {directorio.pagina} de {directorio.totalPaginas}</p>
          {directorio.pagina < directorio.totalPaginas ? <Link href={`/directorio?pagina=${directorio.pagina + 1}`}>Siguiente</Link> : <span />}
        </nav>
      ) : null}
    </main>
  );
}

