import type { Metadata } from "next";
import Link from "next/link";

import { Icono } from "../components/iconos/icono";
import { MuestraPlantillas } from "../components/inicio/muestra-plantillas";
import { VitrinaPortada } from "../components/inicio/vitrina-portada";
import { Introduccion } from "../components/marca/introduccion";
import { Isotipo } from "../components/marca/isotipo";
import { PieSitio } from "../components/sitio/pie-sitio";
import { PRECIO_MENSUAL_BS, construirEnlaceContacto } from "../lib/contacto";
import { CARGA_INICIAL, PLANES, TARJETA_ACRILICO } from "../lib/planes";
import { qrComoSvg } from "../lib/qr-svg";
import { obtenerUrlBaseSitio } from "../lib/url-sitio";
import styles from "./inicio.module.css";

export const metadata: Metadata = {
  title: "MiPuesto, tu catálogo digital por WhatsApp",
  description: `Catálogo propio para tu negocio, con pedidos que se cierran por WhatsApp. Desde Bs ${PRECIO_MENSUAL_BS} al mes y el primer mes gratis.`,
};

/* La portada es un embudo, no un folleto.
 *
 * La versión anterior explicaba todo: rubros, cifras, una sección entera de IA,
 * una tabla contra el catálogo de WhatsApp y otra del directorio. Cada bloque era
 * cierto y juntos eran once pantallas de teléfono antes de ver un precio. Quien
 * llega acá decide en segundos si sigue bajando, y lo que lo hace seguir no es
 * una característica más: es ver su propio negocio funcionando.
 *
 * El orden es el de la decisión: qué es y cuánto cuesta arriba del todo, la
 * prueba en vivo enseguida, cómo se arma, lo que ningún otro ofrece —la tarjeta
 * sobre la mesa—, el precio, y las dudas que quedan. Lo que salió no se perdió:
 * la comparación con WhatsApp y la IA se contestan en las preguntas, que es
 * donde las busca quien las tiene. */

const GARANTIAS = [
  "Primer mes gratis",
  "Sin comisión por venta",
  "Tus clientes no instalan nada",
];

/* Sí es una secuencia —es lo que pasa, en orden, desde que se escribe hasta que
   llega el primer pedido—, así que los números están bien puestos. */
const PASOS = [
  {
    titulo: "Cargás tus productos",
    detalle: `Desde el celular, o nos mandás tu lista de precios y te lo dejamos cargado.`,
  },
  {
    titulo: "Compartís tu enlace",
    detalle: "En tu estado de WhatsApp, en tus redes, y con un QR en tu mostrador.",
  },
  {
    titulo: "Te llegan los pedidos",
    detalle: "Por WhatsApp, con el detalle y el total. Cobrás como cobrás hoy.",
  },
];

const PREGUNTAS = [
  {
    pregunta: "¿Mis clientes tienen que instalar algo?",
    respuesta:
      "No. Abren tu enlace en el navegador del celular, como cualquier página, y tampoco crean una cuenta.",
  },
  {
    pregunta: "¿Y el catálogo de WhatsApp Business, que es gratis?",
    respuesta:
      "Sirve para pocos productos. MiPuesto te da una dirección propia, un QR, búsqueda entre cientos de productos, carrito con el total calculado y promociones con fecha. La venta se sigue cerrando en tu WhatsApp: no te sacamos de ahí, te damos la vidriera que le falta.",
  },
  {
    pregunta: "¿Qué hacen las herramientas de IA?",
    respuesta:
      "Le sacás una foto a tu lista de precios, escrita a mano o impresa, y sale separada producto por producto para que la revises antes de publicar. O elegís la foto de un producto y se completan el nombre y la descripción. El precio lo ponés siempre vos.",
  },
  {
    pregunta: "¿La tarjeta de acrílico incluye el catálogo?",
    respuesta: `No. La tarjeta se paga una vez, Bs ${TARJETA_ACRILICO.precioBs} cada una, y trae su diseño, el QR y el NFC ya configurados. El catálogo es la suscripción mensual, aparte.`,
  },
  {
    pregunta: "¿Cobran comisión por venta?",
    respuesta:
      "No. Pagás tu plan y nada más. Tus ventas las cobrás vos, por donde ya cobrás.",
  },
  {
    pregunta: "¿Qué pasa si un mes no pago?",
    respuesta:
      "Tu catálogo deja de verse, pero no se borra nada durante noventa días. Al reanudar vuelve tal cual estaba.",
  },
  {
    pregunta: "¿Sirve si vendo servicios y no productos?",
    respuesta:
      "Sí. En vez de carrito, tus clientes reservan hora: barberías, consultorios, talleres.",
  },
];

export default function Inicio() {
  const enlaceAlta = construirEnlaceContacto(
    "Hola, quiero probar MiPuesto el primer mes gratis.",
  );
  const enlaceTarjeta = construirEnlaceContacto(
    "Hola, quiero la tarjeta de acrílico con QR y NFC para mi negocio.",
  );

  /* Un QR de verdad, no un dibujo: quien mira la portada en la computadora lo
     escanea con el teléfono y termina recorriendo catálogos reales. Es la misma
     jugada que hace la tarjeta en una mesa, hecha acá mismo. */
  const qrDirectorio = qrComoSvg(
    new URL("/directorio", obtenerUrlBaseSitio()).toString(),
    "Código QR que abre el directorio de catálogos de MiPuesto",
  );

  return (
    <>
      {/* La marca se presenta antes de la portada, una vez por sesión. Va fuera
          del `main` para que nada de adentro pueda encerrar su posición fija. */}
      <Introduccion />

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
              <a href="#asi-se-ve">Así se ve</a>
              <a href="#tarjeta">Tarjeta con QR</a>
              <a href="#precio">Precios</a>
              <a href="#preguntas">Preguntas</a>
            </nav>
            {/* Las altas son por invitación, pero quien ya tiene su catálogo
                necesita volver a entrar. «Probalo gratis» no va acá: está en la
                portada, en el cierre y fijo al pie en el teléfono. */}
            <Link className={styles.enlaceIngresar} href="/login">
              Ingresar
            </Link>
          </div>
        </header>

        {/* 1 · Qué es y cuánto cuesta, en la primera pantalla. */}
        <section className={styles.portada}>
          <div className={styles.portadaContenido}>
            <div className={styles.discurso}>
              <h1>Tu negocio, abierto en el celular de tus clientes</h1>
              <p className={styles.promesa}>
                Un catálogo con tus productos y precios, un enlace para compartir y pedidos
                que te llegan por WhatsApp.
              </p>
              <div className={styles.acciones}>
                <a
                  className={styles.botonPrincipal}
                  href={enlaceAlta}
                  rel="noreferrer"
                  target="_blank"
                >
                  Probalo gratis un mes
                </a>
                <a className={styles.botonSecundario} href="#asi-se-ve">
                  Ver cómo queda
                </a>
              </div>
              {/* El precio arriba y no escondido al final: quien no lo encuentra
                  supone que es caro y se va a buscarlo a otra parte. */}
              <p className={styles.precioAncla}>
                Después, desde <strong>Bs {PRECIO_MENSUAL_BS} al mes</strong>. Sin contrato.
              </p>
              <ul className={styles.garantias}>
                {GARANTIAS.map((garantia) => (
                  <li key={garantia}>
                    <Icono nombre="listo" />
                    {garantia}
                  </li>
                ))}
              </ul>
            </div>
            <VitrinaPortada />
          </div>
        </section>

        {/* 2 · La prueba: el catálogo de verdad, con el rubro de quien mira. */}
        <section aria-labelledby="asi-se-ve" className={styles.seccion}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
              <h2 id="asi-se-ve">Así lo ve tu cliente</h2>
              <p>
                Elegí tu rubro y probalo. No es una captura: es el mismo catálogo que va a
                recibir quien te compra.
              </p>
            </div>
            <MuestraPlantillas />
            <p className={styles.nota}>
              ¿Preferís ver negocios reales?{" "}
              <Link href="/directorio">Abrí el directorio de catálogos</Link>.
            </p>
          </div>
        </section>

        {/* 3 · Cómo se arma. Corto: la duda acá es «¿me va a costar?», y la
            respuesta es tres renglones. */}
        <section aria-labelledby="como-funciona" className={styles.seccionSuave}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
              <h2 id="como-funciona">Listo en una tarde</h2>
              <p>No hace falta saber de computación. Si mandás fotos por WhatsApp, podés.</p>
            </div>
            <ol className={styles.pasos}>
              {PASOS.map(({ titulo, detalle }, indice) => (
                <li key={titulo}>
                  <span aria-hidden="true" className={styles.numero}>
                    {indice + 1}
                  </span>
                  <div>
                    <h3>{titulo}</h3>
                    <p>{detalle}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4 · La tarjeta. Es el único lugar audaz de la página —fondo de
            marca, pieza dibujada— porque es lo único que nadie más ofrece: el
            catálogo sale del teléfono y se sienta en la mesa. */}
        <section aria-labelledby="tarjeta" className={styles.seccionTarjeta}>
          <div className={styles.tarjetaContenido}>
            <div className={styles.tarjetaTexto}>
              <h2 id="tarjeta">Tu catálogo, sobre la mesa</h2>
              <p className={styles.tarjetaPromesa}>
                Una tarjeta de acrílico con el diseño de tu negocio. Tu cliente escanea el QR
                o acerca el celular, abre tu catálogo y, desde ahí, te califica en Google
                Maps.
              </p>
              <ul className={styles.tarjetaBeneficios}>
                <li>
                  <Icono nombre="codigoQr" />
                  <span>
                    <strong>QR y NFC</strong> que abren tu catálogo sin escribir nada.
                  </span>
                </li>
                <li>
                  <Icono nombre="mapa" />
                  <span>
                    <strong>Más calificaciones en Google Maps.</strong> Cuantas más tenés,
                    más arriba aparecés cuando alguien busca cerca.
                  </span>
                </li>
                <li>
                  <Icono nombre="paleta" />
                  <span>
                    <strong>Diseño hecho para tu negocio</strong>, con tu nombre, tu logo y
                    tus colores. Lo configuramos nosotros.
                  </span>
                </li>
              </ul>
              <div className={styles.tarjetaPrecio}>
                <p>
                  <strong>Bs {TARJETA_ACRILICO.precioBs}</strong> cada tarjeta
                </p>
                <p>{TARJETA_ACRILICO.medidas}. No incluye el mes del catálogo.</p>
              </div>
              <a
                className={styles.botonTarjeta}
                href={enlaceTarjeta}
                rel="noreferrer"
                target="_blank"
              >
                Quiero mi tarjeta
              </a>
            </div>

            {/* La tarjeta dibujada: un acrílico parado sobre su base, con lo que
                lleva impreso. Se la describe entera para quien no la ve. */}
            <figure className={styles.acrilico}>
              <div className={styles.acrilicoPlaca}>
                <div className={styles.impreso}>
                  <p className={styles.impresoNegocio}>Tu negocio</p>
                  <p className={styles.impresoLlamada}>Mirá nuestro catálogo</p>
                  <div
                    className={styles.impresoQr}
                    dangerouslySetInnerHTML={{ __html: qrDirectorio }}
                  />
                  <p className={styles.impresoNfc}>
                    <Icono nombre="nfc" />
                    o acercá tu celular
                  </p>
                  <div className={styles.impresoGoogle}>
                    <Icono nombre="mapa" />
                    <span>
                      <span aria-hidden="true" className={styles.estrellas}>
                        <Icono nombre="estrella" />
                        <Icono nombre="estrella" />
                        <Icono nombre="estrella" />
                        <Icono nombre="estrella" />
                        <Icono nombre="estrella" />
                      </span>
                      Calificanos en Google Maps
                    </span>
                  </div>
                  <p className={styles.impresoMarca}>
                    <Isotipo className={styles.impresoIsotipo} />
                    MiPuesto
                  </p>
                </div>
              </div>
              <div aria-hidden="true" className={styles.acrilicoBase} />
              <figcaption>
                Escaneá este QR con tu celular: abre catálogos de negocios reales.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* 5 · El precio. Dos planes y, aparte, lo que se paga una sola vez. */}
        <section aria-labelledby="precio" className={styles.seccion}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
              <h2 id="precio">Precios claros, en bolivianos</h2>
              <p>
                El primer mes es gratis en los dos planes. Sin contrato y sin comisión por
                venta: se paga mes a mes.
              </p>
            </div>

            <div className={styles.planes}>
              {PLANES.map((plan) => (
                <article
                  className={plan.destacado ? styles.planDestacado : styles.plan}
                  key={plan.id}
                >
                  {plan.destacado ? <p className={styles.sello}>Con IA</p> : null}
                  <h3>{plan.nombre}</h3>
                  <p className={styles.monto}>
                    Bs {plan.precioBs}
                    <span>al mes</span>
                  </p>
                  <p className={styles.paraQuien}>{plan.para}</p>
                  <ul>
                    {plan.incluye.map((item) => (
                      <li key={item}>
                        <Icono nombre="listo" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a
                    className={plan.destacado ? styles.botonPlanFuerte : styles.botonPlan}
                    href={construirEnlaceContacto(
                      `Hola, quiero probar el plan ${plan.nombre} de MiPuesto.`,
                    )}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Empezar con este
                  </a>
                </article>
              ))}
            </div>

            {/* Filas y no tarjetas: son otra cosa —se pagan una vez— y
                presentarlos como un tercer y cuarto plan obligaría a comparar
                cuatro cuando la decisión es entre dos. */}
            <div className={styles.extras}>
              <h3>Aparte, y una sola vez</h3>
              <ul>
                <li>
                  <div>
                    <p className={styles.extraNombre}>Te cargamos el catálogo</p>
                    <p>
                      Nos mandás tu lista de precios y te lo entregamos ordenado, hasta{" "}
                      {CARGA_INICIAL.productosMaximos} productos.
                    </p>
                  </div>
                  <p className={styles.extraPrecio}>
                    Bs {CARGA_INICIAL.precioBs}
                    <span>pago único</span>
                  </p>
                  <a
                    href={construirEnlaceContacto(
                      "Hola, quiero que me carguen el catálogo con mi lista de precios.",
                    )}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Pedirlo
                  </a>
                </li>
                <li>
                  <div>
                    <p className={styles.extraNombre}>Tarjeta de acrílico con QR y NFC</p>
                    <p>
                      Diseño para tu negocio y configuración incluidos. {TARJETA_ACRILICO.medidas}.
                    </p>
                  </div>
                  <p className={styles.extraPrecio}>
                    Bs {TARJETA_ACRILICO.precioBs}
                    <span>por tarjeta</span>
                  </p>
                  <a href={enlaceTarjeta} rel="noreferrer" target="_blank">
                    Pedirla
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 6 · Las dudas que quedan, donde las busca quien las tiene. */}
        <section aria-labelledby="preguntas" className={styles.seccionSuave}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
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

        {/* 7 · El cierre, con la misma acción que la portada. */}
        <section aria-labelledby="cierre" className={styles.cierre}>
          <div className={styles.cierreContenido}>
            <Isotipo className={styles.isotipoCierre} titulo="MiPuesto" />
            <h2 id="cierre">Tu primer mes corre por nuestra cuenta</h2>
            <p>Escribinos por WhatsApp y lo armamos juntos. Si no te convence, no pagás nada.</p>
            <a className={styles.botonCierre} href={enlaceAlta} rel="noreferrer" target="_blank">
              Probalo gratis un mes
            </a>
          </div>
        </section>

        <div className={styles.accionFija}>
          <a className={styles.botonFijo} href={enlaceAlta} rel="noreferrer" target="_blank">
            Probalo gratis un mes
          </a>
        </div>
      </main>
      <PieSitio />
    </>
  );
}
