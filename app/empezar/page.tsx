import type { Metadata } from "next";
import Link from "next/link";

import { BarraEmpezar } from "../../components/empezar/barra-empezar";
import { Icono } from "../../components/iconos/icono";
import type { NombreIcono } from "../../components/iconos/trazos";
import { CabeceraSitio } from "../../components/sitio/cabecera-sitio";
import { PieSitio } from "../../components/sitio/pie-sitio";
import { PALETAS } from "../../lib/apariencia";
import { CIUDADES, nombreDeCiudad } from "../../lib/negocios/lugares";
import { rubrosPublicosPorGrupo } from "../../lib/negocios/rubros-publicos";
import {
  OPCIONES_ALTA,
  PROMO_SEGUNDO_MES,
  TARJETA_ACRILICO,
  TARJETA_ACRILICO_GRANDE,
  opcionAlta,
} from "../../lib/planes";
import styles from "./empezar.module.css";

export const metadata: Metadata = {
  title: "Empieza con MiPuesto",
  description:
    "Todo lo que trae tu catálogo: pedidos por WhatsApp, turnos, promociones, banners, tu resumen y carga rápida. Elige cómo empezar.",
};

/* La página a la que lleva cada botón de contratar (pedido del dueño,
 * 2026-10-22).
 *
 * La portada cuenta el producto en ejemplos; acá va **todo** lo que trae, para
 * quien ya decidió mirar en serio. La opción elegida viaja en la dirección
 * (`?opcion=prueba`, `catalogo`, `activo` o `anual`) y se puede cambiar arriba;
 * el botón fijo de abajo la lleva siempre, y recién él abre el formulario corto
 * que arma el mensaje de WhatsApp. */

type Beneficio = { icono: NombreIcono; titulo: string; texto: string };

const BENEFICIOS: Beneficio[] = [
  {
    icono: "tienda",
    titulo: "Tu catálogo, con tu nombre",
    texto: "Tu dirección propia y tu código QR, para compartir en tu estado, tus redes y tu mostrador.",
  },
  {
    icono: "carrito",
    titulo: "Pedidos por WhatsApp",
    texto: "Tus clientes arman su pedido con carrito y te llega con el detalle y el total. Apartamos el stock mientras respondes.",
  },
  {
    icono: "calendario",
    titulo: "Turnos y reservas",
    texto: "Si das servicios, tus clientes reservan hora y la confirmas desde tu agenda: quién atiende, horarios y cupos.",
  },
  {
    icono: "etiqueta",
    titulo: "Promociones con fecha",
    texto: "Descuentos por producto o por categoría, con el precio de antes tachado. Por días, por horas, y las pausas cuando quieras.",
  },
  {
    icono: "idea",
    titulo: "Dos banners",
    texto: "Franjas con imagen para tus ofertas o avisos: una arriba de tus productos y otra a la mitad del catálogo.",
  },
  {
    icono: "grafico",
    titulo: "Tu resumen",
    texto: "Cuántos abrieron tu catálogo, cuántos te escribieron, los pedidos de la semana y lo que más agregan.",
  },
  {
    icono: "rayo",
    titulo: "Carga rápida",
    texto: "Una foto de tu lista de precios se vuelve productos con IA. O subes tu planilla de Excel, gratis y sin tope.",
  },
  {
    icono: "caja",
    titulo: "Tallas, tamaños y stock",
    texto: "Cada presentación con su precio y sus existencias. Cuando algo se acaba, tu catálogo lo marca agotado.",
  },
  {
    icono: "lupa",
    titulo: "Te encuentran por lo que vendes",
    texto: "Apareces en el directorio de tu ciudad cuando alguien busca lo tuyo, con tu zona y sin publicar tu dirección exacta.",
  },
  {
    icono: "paleta",
    titulo: "Con tu cara",
    texto: `${PALETAS.length} paletas de color, tres formas de mostrar tus productos, el fondo de tu rubro, tu logo y tu portada.`,
  },
  {
    icono: "reloj",
    titulo: "Horario y fechas especiales",
    texto: "Fuera de tu horario te ven pero no te piden. Y cargas feriados o días en que atiendes distinto.",
  },
  {
    icono: "documento",
    titulo: "Respaldo y ayuda",
    texto: "Descargas tu catálogo en Excel cuando quieras, y tienes videos cortos y ayuda por WhatsApp.",
  },
];

type Propiedades = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaginaEmpezar({ searchParams }: Propiedades) {
  const parametros = await searchParams;
  const elegida = opcionAlta(parametros.opcion);

  /* Los rubros y las ciudades se arman acá, en el servidor: el formulario solo
     los recibe ya escritos. */
  const rubros = rubrosPublicosPorGrupo().map(({ grupo, rubros: lista }) => ({
    grupo,
    rubros: lista.map(({ id, nombre }) => ({ id, nombre })),
  }));
  const ciudades = CIUDADES.map((id) => ({ id, nombre: nombreDeCiudad(id) }));

  return (
    <>
      <CabeceraSitio actual="inicio" />
      <main className={styles.pagina}>
        {/* 1 · La opción elegida, y las demás a un toque. */}
        <section aria-labelledby="empezar" className={styles.portada}>
          <div className={styles.contenido}>
            <div className={styles.encabezado}>
              <h1 id="empezar">Todo lo que trae tu catálogo</h1>
              <p>Elige cómo empezar. Puedes cambiarlo cuando quieras, y no hay contrato.</p>
            </div>
            <ul className={styles.opciones}>
              {OPCIONES_ALTA.map((opcion) => (
                <li key={opcion.id}>
                  <Link
                    aria-current={opcion.id === elegida.id ? "true" : undefined}
                    className={styles.opcion}
                    href={`/empezar?opcion=${opcion.id}`}
                    replace
                    scroll={false}
                  >
                    <span className={styles.opcionMarca} aria-hidden="true">
                      {opcion.id === elegida.id ? <Icono nombre="listo" /> : null}
                    </span>
                    <strong>{opcion.nombre}</strong>
                    <span className={styles.opcionPrecio}>{opcion.precio}</span>
                    <span className={styles.opcionDetalle}>{opcion.detalle}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {elegida.id === "catalogo" || elegida.id === "activo" ? (
              <p className={styles.promo}>
                <Icono nombre="estrella" /> {PROMO_SEGUNDO_MES}
              </p>
            ) : null}
          </div>
        </section>

        {/* 2 · Todo lo que trae, en todas las opciones. */}
        <section aria-labelledby="incluye" className={styles.seccion}>
          <div className={styles.contenido}>
            <div className={styles.encabezadoClaro}>
              <h2 id="incluye">Lo que incluye, en todas las opciones</h2>
              <p>Lo que cambia entre una y otra es cuántos productos entran y cuánta IA trae.</p>
            </div>
            <ul className={styles.beneficios}>
              {BENEFICIOS.map(({ icono, titulo, texto }) => (
                <li key={titulo}>
                  <span aria-hidden="true" className={styles.beneficioIcono}>
                    <Icono nombre={icono} />
                  </span>
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 3 · Las tarjetas de acrílico, que se piden en el mismo mensaje. */}
        <section aria-labelledby="tarjetas" className={styles.seccionTarjeta}>
          <div className={styles.contenido}>
            <div className={styles.encabezadoClaro}>
              <h2 id="tarjetas">¿Quieres tu catálogo en tu mesa?</h2>
              <p>
                Una tarjeta de acrílico con tu diseño: la escanean o acercan el celular, y abren tu
                catálogo. Se paga una vez y la configuramos nosotros. Puedes pedirla al continuar.
              </p>
            </div>
            <ul className={styles.tarjetas}>
              {[TARJETA_ACRILICO, TARJETA_ACRILICO_GRANDE].map((tarjeta) => (
                <li key={tarjeta.nombre}>
                  <span aria-hidden="true" className={styles.beneficioIcono}>
                    <Icono nombre="nfc" />
                  </span>
                  <h3>{tarjeta.nombre}</h3>
                  <p className={styles.tarjetaPrecio}>
                    Bs {tarjeta.precioBs}
                    <span> por tarjeta</span>
                  </p>
                  <p>{tarjeta.medidas}. Con QR, NFC y tu logo.</p>
                </li>
              ))}
            </ul>
            <p className={styles.nota}>No incluye el mes del catálogo: es aparte.</p>
          </div>
        </section>
      </main>
      <BarraEmpezar ciudades={ciudades} opcion={elegida.id} rubros={rubros} />
      <PieSitio />
    </>
  );
}
