import type { Metadata } from "next";
import { PieSitio } from "../components/sitio/pie-sitio";
import Link from "next/link";

import { Isotipo } from "../components/marca/isotipo";
import { MuestraPlantillas } from "../components/inicio/muestra-plantillas";
import { VitrinaPortada } from "../components/inicio/vitrina-portada";
import { PALETAS, PLANTILLAS } from "../lib/apariencia";
import { PRECIO_MENSUAL_BS, construirEnlaceContacto } from "../lib/contacto";
import { CARGA_INICIAL, PLANES, PLAN_ANUAL, ahorroAnualBs } from "../lib/planes";
import styles from "./inicio.module.css";

export const metadata: Metadata = {
  title: "MiPuesto, tu catálogo digital por WhatsApp",
  description: `Catálogo propio para tu negocio, con pedidos que se cierran por WhatsApp. Bs ${PRECIO_MENSUAL_BS} al mes y el primer mes gratis.`,
};

/* Las cifras salen del registro y no de un texto escrito a mano: la portada ya
   quedó desactualizada una vez cuando se sumaron plantillas y paletas. */
const TOTAL_PLANTILLAS = PLANTILLAS.length;
const TOTAL_PALETAS = PALETAS.length;

const GARANTIAS = [
  "Sin comisión por venta",
  "Sin app ni cuenta para tus clientes",
  "Primer mes gratis",
];

const RUBROS = [
  {
    titulo: "Restaurantes y comida",
    detalle: "Carta por categorías, pedidos con carrito y aviso de si estás abierto.",
    plantilla: "Clásica",
  },
  {
    titulo: "Tiendas y ropa",
    detalle: "Vitrina con fotos grandes, tallas y colores como productos aparte.",
    plantilla: "Moderna",
  },
  {
    titulo: "Servicios con turno",
    detalle: "Barberías, consultorios y talleres. En vez de carrito, tus clientes reservan.",
    plantilla: "Mínima",
  },
  {
    titulo: "Puestos de mercado",
    detalle: "Lista de precios: cifras grandes y muchos productos en una sola pantalla.",
    plantilla: "Feria",
  },
];

const PASOS = [
  {
    titulo: "Cargás tus productos",
    detalle: "Foto, nombre y precio. Desde el celular, entre cliente y cliente.",
  },
  {
    titulo: "Elegís cómo se ve",
    detalle: `${TOTAL_PLANTILLAS} estructuras y ${TOTAL_PALETAS} colores. Cambiarlo después no toca tus productos.`,
  },
  {
    titulo: "Compartís tu enlace",
    detalle: "Un link y un código QR para imprimir. El pedido te llega por WhatsApp.",
  },
];

/* La objeción real no es el precio: es que el catálogo de WhatsApp es gratis.
   Contestarla de frente vale más que cualquier lista de características. */
const COMPARACION = [
  { que: "Dirección web propia para compartir", whatsapp: false },
  { que: "Código QR para pegar en tu puesto", whatsapp: false },
  { que: "Buscar entre cientos de productos", whatsapp: false },
  { que: "Promociones con fecha y control de stock", whatsapp: false },
  { que: "Saber cuántos te visitan cada semana", whatsapp: false },
  { que: "Pedido con carrito y total calculado", whatsapp: false },
];


const PREGUNTAS = [
  {
    pregunta: "¿Mis clientes necesitan instalar algo?",
    respuesta:
      "No. Abren tu enlace en el navegador del celular, como cualquier página. Tampoco tienen que crear una cuenta.",
  },
  {
    pregunta: "¿Cobran comisión por venta?",
    respuesta: `No. Pagás Bs ${PRECIO_MENSUAL_BS} al mes y nada más. El dinero de tus ventas lo cobrás vos, por donde ya cobrás hoy.`,
  },
  {
    pregunta: "¿Qué pasa si un mes no pago?",
    respuesta:
      "Tu catálogo deja de verse, pero no se borra nada. Seguís entrando a tu panel y ves tus productos y pedidos. Cuando reanudás, todo vuelve tal cual estaba.",
  },
  {
    pregunta: "¿Puedo usarlo si no vendo productos, sino servicios?",
    respuesta:
      "Sí. Una de las estructuras está pensada para servicios con turno: barberías, consultorios, talleres. En vez de carrito, tus clientes reservan.",
  },
  {
    pregunta: "¿Necesito saber de computación?",
    respuesta:
      "No. Si sabés mandar una foto por WhatsApp, sabés cargar un producto. Y si algo no se entiende, escribinos y lo vemos juntos.",
  },
  {
    pregunta: "¿Qué datos guardan de mis clientes?",
    respuesta:
      "Solo el nombre y el teléfono que ellos escriben al hacer un pedido, para que puedas atenderlos. No los usamos para otra cosa ni se los damos a nadie.",
  },
];

export default function Inicio() {
  const enlaceAlta = construirEnlaceContacto(
    "Hola, quiero abrir mi catálogo en MiPuesto.",
  );

  return (
    <>
      <main className={styles.pagina}>
        <header className={styles.barra}>
          <div className={styles.barraContenido}>
            <Link className={styles.marca} href="/">
              <Isotipo className={styles.isotipo} />
              <span className={styles.nombreMarca}>
                <strong>MiPuesto</strong>
                <small>Bolivia</small>
              </span>
            </Link>
            <nav aria-label="Secciones de esta página" className={styles.enlaces}>
              <a href="#rubros">Para quién es</a>
              <a href="#asi-se-ve">Así se ve</a>
              <a href="#precio">Precio</a>
              <a href="#preguntas">Preguntas</a>
            </nav>
            <div className={styles.accionesBarra}>
              {/* Las altas son por invitación, pero quien ya tiene su catálogo
                  necesita volver a entrar, y no había por dónde: la única forma
                  era saberse la dirección de memoria. */}
              {/* «Quiero mi catálogo» no está acá a propósito: aparece cuatro
                  veces en el cuerpo y una más fija al pie, que además viaja con
                  la pantalla. Repetirlo en la barra le quitaba lugar al nombre
                  sin agregar ninguna oportunidad de tocarlo. */}
              <Link className={styles.enlaceIngresar} href="/login">
                Ingresar
              </Link>
            </div>
          </div>
        </header>

        <section className={styles.portada}>
          <div className={styles.portadaContenido}>
            <div className={styles.discurso}>
              <p className={styles.marcador}>
                <Isotipo className={styles.marcaMarcador} />
                Catálogos digitales para negocios de Bolivia
              </p>
              <h1>
                Tu puesto, abierto en el celular de tus clientes
              </h1>
              <p className={styles.promesa}>
                Un catálogo propio para mostrar lo que vendés, con precios al día y pedidos
                que te llegan por WhatsApp. Seguís cobrando como cobrás hoy.
              </p>
              <div className={styles.acciones}>
                <a
                  className={styles.botonPrincipal}
                  href={enlaceAlta}
                  rel="noreferrer"
                  target="_blank"
                >
                  Quiero mi catálogo
                </a>
                <Link className={styles.botonSecundario} href="/directorio">
                  Ver negocios que ya lo usan
                </Link>
              </div>
              <ul className={styles.garantias}>
                {GARANTIAS.map((garantia) => (
                  <li key={garantia}>{garantia}</li>
                ))}
              </ul>
            </div>
            <VitrinaPortada />
          </div>
        </section>

        <section aria-label="En resumen" className={styles.franja}>
          <Isotipo className={styles.filigrana} />
          <div className={styles.franjaContenido}>
            <p>
              <strong>Bs {PRECIO_MENSUAL_BS}</strong>
              <span>al mes, sin contrato</span>
            </p>
            <p>
              <strong>0 %</strong>
              <span>de comisión por venta</span>
            </p>
            <p>
              <strong>{TOTAL_PLANTILLAS} diseños</strong>
              <span>y {TOTAL_PALETAS} colores para elegir</span>
            </p>
            <p>
              <strong>1 mes</strong>
              <span>gratis para probar</span>
            </p>
          </div>
        </section>

        <section aria-labelledby="rubros" className={styles.seccion}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
              <p className={styles.rotulo}>{TOTAL_PLANTILLAS} diseños para elegir</p>
              <h2 id="rubros">Para quién es</h2>
              <p>
                Cada diseño nació de un rubro distinto. No cambian solo de color: cambia
                qué se ve primero. Te recomendamos uno, pero elegís el que quieras.
              </p>
            </div>
            <ul className={styles.rubros}>
              {RUBROS.map(({ titulo, detalle, plantilla }) => (
                <li key={titulo}>
                  <span className={styles.etiquetaPlantilla}>{plantilla}</span>
                  <h3>{titulo}</h3>
                  <p>{detalle}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="como-funciona" className={styles.seccionSuave}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
              <p className={styles.rotulo}>Simple y rápido</p>
              <h2 id="como-funciona">Cómo se pone en marcha</h2>
              <p>Se hace en una tarde, y no hace falta que sepas de computación.</p>
            </div>
            <ol className={styles.pasos}>
              {PASOS.map(({ titulo, detalle }, indice) => (
                <li key={titulo}>
                  <span aria-hidden="true" className={styles.numero}>
                    {indice + 1}
                  </span>
                  <h3>{titulo}</h3>
                  <p>{detalle}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="asi-se-ve" className={styles.seccion}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
              <p className={styles.rotulo}>Demostración en vivo</p>
              <h2 id="asi-se-ve">Elegí tu rubro y miralo</h2>
              <p>
                Con productos y precios de tu oficio, y los {TOTAL_PLANTILLAS} diseños a
                mano para probarlos. Lo que ves acá es exactamente lo que recibe tu
                cliente, no una imagen de muestra.
              </p>
            </div>
            <MuestraPlantillas />
          </div>
        </section>

        <section aria-labelledby="herramientas-ia" className={styles.seccionIa}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezadoIa}>
              <p className={styles.rotuloIa}>Herramientas con inteligencia artificial</p>
              <h2 id="herramientas-ia">Sacale una foto. El catálogo se escribe solo.</h2>
              <p>
                Lo que más cuesta de un catálogo no es decidirse: es tipear doscientos
                productos. Estas dos herramientas hacen ese trabajo y te dejan a vos lo
                único que no puede hacer una máquina, que es revisar y poner el precio.
              </p>
            </div>

            <div className={styles.tarjetasIa}>
              <article className={styles.tarjetaIa}>
                <div className={styles.tarjetaIaCuerpo}>
                  <p className={styles.numeroIa}>01</p>
                  <h3>De tu lista de precios al catálogo</h3>
                  <p>
                    Fotografiá la lista que ya usás, escrita a mano o impresa. Se separa
                    producto por producto, con su precio y su categoría, y aparece en una
                    pantalla para que corrijas antes de publicar.
                  </p>
                  <p className={styles.datoIa}>
                    <strong>Un catálogo de 200 productos</strong> pasa de unas seis horas y
                    media de tipeo a hora y media de revisión.
                  </p>
                </div>
              </article>

              <article className={styles.tarjetaIa}>
                <div className={styles.tarjetaIaCuerpo}>
                  <p className={styles.numeroIa}>02</p>
                  <h3>De la foto del producto a su ficha</h3>
                  <p>
                    Elegí la foto de un producto y se completan solos el nombre y la
                    descripción. Esa misma foto queda adjunta como imagen del producto, sin
                    que tengas que subirla dos veces.
                  </p>
                  <p className={styles.datoIa}>
                    <strong>El precio nunca sale de una foto.</strong> Ese lo ponés vos,
                    siempre, porque ninguna máquina sabe cuánto cobrás.
                  </p>
                </div>
              </article>
            </div>

            <p className={styles.remateIa}>
              Nada se publica sin que lo apruebes, y nada se envía sin que elijas la foto.{" "}
              <Link href="/privacidad">Cómo tratamos esas fotografías</Link>.
            </p>
          </div>
        </section>

        <section aria-labelledby="comparacion" className={styles.seccionSuave}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
              <p className={styles.rotulo}>La pregunta honesta</p>
              <h2 id="comparacion">¿Y el catálogo de WhatsApp?</h2>
              <p>
                Es gratis y sirve. Pero se queda corto apenas tu negocio crece, y nunca fue
                una vidriera.
              </p>
            </div>
            <div className={styles.tablaEnvoltorio}>
              <table className={styles.comparacion}>
              <thead>
                <tr>
                  <th scope="col">
                    <span className={styles.ocultoVisual}>Función</span>
                  </th>
                  <th scope="col">Catálogo de WhatsApp</th>
                  <th scope="col">MiPuesto</th>
                </tr>
              </thead>
              <tbody>
                {COMPARACION.map(({ que }) => (
                  <tr key={que}>
                    <th scope="row">{que}</th>
                    <td>
                      <span className={styles.no}>No</span>
                    </td>
                    <td>
                      <span className={styles.si}>Sí</span>
                    </td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">Dónde se cierra la venta</th>
                  <td>WhatsApp</td>
                  <td>WhatsApp</td>
                </tr>
              </tbody>
              </table>
            </div>
            <p className={styles.remate}>
              No te sacamos de WhatsApp. Te damos la vidriera que le falta.
            </p>
          </div>
        </section>

        <section aria-labelledby="precio" className={styles.seccion}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
              <p className={styles.rotulo}>Precios en bolivianos, sin letra chica</p>
              <h2 id="precio">Elegí cómo empezar</h2>
              <p>
                Sin comisión por venta, sin contrato de permanencia y el primer mes gratis
                en los dos planes. Se paga mes a mes, y si dejás de pagar tus datos te
                esperan noventa días.
              </p>
            </div>

            <div className={styles.planes}>
              {PLANES.map((plan) => (
                <article
                  className={plan.destacado ? styles.planDestacado : styles.plan}
                  key={plan.id}
                >
                  {plan.destacado ? (
                    <p className={styles.selloPlan}>El que más eligen</p>
                  ) : null}
                  <h3>{plan.nombre}</h3>
                  <p className={styles.montoPlan}>
                    Bs {plan.precioBs}
                    <span>al mes</span>
                  </p>
                  {/* El pago por año va debajo del mensual y no como una tarjeta
                      aparte: es la misma cosa con otra forma de pagarla, y una
                      tarjeta más obligaría a comparar tres cuando hay dos. */}
                  {plan.id === PLAN_ANUAL.planId ? (
                    <p className={styles.pagoAnual}>
                      o <strong>Bs {PLAN_ANUAL.precioBs} al año</strong> — te ahorrás Bs{" "}
                      {ahorroAnualBs()}
                    </p>
                  ) : null}
                  <p className={styles.paraQuien}>{plan.para}</p>
                  <ul>
                    {plan.incluye.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <a
                    className={plan.destacado ? styles.botonPlanFuerte : styles.botonPlan}
                    href={construirEnlaceContacto(
                      `Hola, me interesa el plan ${plan.nombre} de MiPuesto.`,
                    )}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Quiero este
                  </a>
                </article>
              ))}

              {/* Se cobra una vez porque el trabajo se hace una vez. Va al lado de
                  los planes y no escondido: es lo que resuelve el día uno. */}
              <article className={styles.planCarga}>
                <p className={styles.selloCarga}>Una sola vez</p>
                <h3>Te lo dejamos cargado</h3>
                <p className={styles.montoPlan}>
                  Bs {CARGA_INICIAL.precioBs}
                  <span>pago único</span>
                </p>
                <p className={styles.paraQuien}>
                  Mandanos tu lista de precios y te entregamos el catálogo cargado,
                  ordenado por categorías y listo para compartir.
                </p>
                <ul>
                  <li>Hasta {CARGA_INICIAL.productosMaximos} productos</li>
                  <li>Lo hacemos nosotros, no vos</li>
                  <li>Revisado producto por producto antes de publicar</li>
                  <li>Se suma a cualquiera de los dos planes</li>
                </ul>
                <a
                  className={styles.botonPlan}
                  href={construirEnlaceContacto(
                    "Hola, quiero que me carguen el catálogo con mi lista de precios.",
                  )}
                  rel="noreferrer"
                  target="_blank"
                >
                  Quiero que lo carguen
                </a>
              </article>
            </div>

            <p className={styles.aclaracionPlanes}>
              Las lecturas de foto no se acumulan de un mes al otro y el contador vuelve a
              cero el día 1. Podés cambiar de plan cuando quieras, escribiendo.
            </p>
          </div>
        </section>

        {/* El directorio existe desde hace meses y estaba en un solo botón de la
            portada. Es la prueba más barata de que el servicio es real: catálogos
            de negocios que se pueden abrir ahora mismo. */}
        <section aria-labelledby="directorio" className={styles.seccionDirectorio}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
              <p className={styles.rotulo}>Negocios que ya lo usan</p>
              <h2 id="directorio">Mirá catálogos de verdad, no capturas de pantalla</h2>
              <p>
                Todos los negocios activos aparecen en un directorio público, agrupado por
                ciudad. Son catálogos reales, con sus productos y sus precios de hoy: los
                abrís, los recorrés y ves exactamente lo que va a ver tu cliente.
              </p>
            </div>
            <div className={styles.beneficiosDirectorio}>
              <article>
                <h3>Te encuentran sin buscarte</h3>
                <p>
                  Alguien que busca una barbería en tu zona llega a tu catálogo desde el
                  directorio, sin conocerte y sin que le pases tu enlace.
                </p>
              </article>
              <article>
                <h3>Entrás el día que publicás</h3>
                <p>
                  No hay trámite ni espera. Tu negocio aparece en cuanto tu catálogo está
                  activo, y sale el día que dejás de publicarlo.
                </p>
              </article>
              <article>
                <h3>Antes de decidir, comprobalo</h3>
                <p>
                  Abrí el catálogo de alguien de tu rubro y probá pedir algo. Es la forma
                  más rápida de saber si esto le sirve a tu negocio.
                </p>
              </article>
            </div>
            <Link className={styles.botonDirectorio} href="/directorio">
              Ver el directorio de negocios
            </Link>
          </div>
        </section>

        <section aria-labelledby="preguntas" className={styles.seccion}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
              <p className={styles.rotulo}>Dudas resueltas</p>
              <h2 id="preguntas">Preguntas frecuentes</h2>
            </div>
            <div className={styles.preguntas}>
              {PREGUNTAS.map(({ pregunta, respuesta }) => (
                <details key={pregunta}>
                  <summary>{pregunta}</summary>
                  <p>{respuesta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="cierre" className={styles.cierre}>
          <div className={styles.cierreContenido}>
            {/* El isotipo grande y el nombre como texto, en vez del logotipo
                completo en PNG: así el cierre hereda el color en vez de forzarlo
                con un filtro, y se ve nítido en cualquier pantalla. */}
            <p className={styles.marcaCierre}>
              <Isotipo className={styles.isotipoCierre} titulo="MiPuesto" />
              <span>MiPuesto</span>
            </p>
            <h2 id="cierre">Tu catálogo puede estar listo hoy</h2>
            <p>
              Escribinos por WhatsApp y lo armamos juntos. Si no te convence, el primer mes
              no te costó nada.
            </p>
            <a className={styles.botonCierre} href={enlaceAlta} rel="noreferrer" target="_blank">
              Quiero mi catálogo
            </a>
          </div>
        </section>

        <div className={styles.accionFija}>
          <a className={styles.botonFijo} href={enlaceAlta} rel="noreferrer" target="_blank">
            Quiero mi catálogo
          </a>
        </div>
      </main>
        <PieSitio />
    </>
  );
}
