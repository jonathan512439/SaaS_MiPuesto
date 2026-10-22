import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { BuscadorVivo } from "../components/directorio/buscador-vivo";
import {
  BUSQUEDAS_POPULARES,
  EJEMPLOS_DE_BUSQUEDA,
  ICONO_DE_RUBRO,
} from "../components/directorio/iconos-rubro";
import { Icono } from "../components/iconos/icono";
import { IconoCatalogo } from "../components/iconos/icono-catalogo";
import { MuestraPlantillas } from "../components/inicio/muestra-plantillas";
import { VitrinaPortada } from "../components/inicio/vitrina-portada";
import { Introduccion } from "../components/marca/introduccion";
import { Isotipo } from "../components/marca/isotipo";
import { CabeceraSitio } from "../components/sitio/cabecera-sitio";
import { PieSitio } from "../components/sitio/pie-sitio";
import { PRECIO_MENSUAL_BS, construirEnlaceContacto } from "../lib/contacto";
import { RUBROS_PUBLICOS } from "../lib/negocios/rubros-publicos";
import {
  CARGA_INICIAL,
  PLAN_PRUEBA,
  PLANES,
  PROMO_SEGUNDO_MES,
  TARJETA_ACRILICO,
  TARJETA_ACRILICO_GRANDE,
  describirPrueba,
} from "../lib/planes";
import { qrComoSvg } from "../lib/qr-svg";
import { DOMINIO_MIPUESTO, obtenerUrlBaseSitio } from "../lib/url-sitio";
import styles from "./inicio.module.css";

export const metadata: Metadata = {
  title: "MiPuesto, tu catálogo digital por WhatsApp",
  description: `Catálogo propio para tu negocio, con pedidos que se cierran por WhatsApp. Desde Bs ${PRECIO_MENSUAL_BS} al mes. Pruébalo gratis ${PLAN_PRUEBA.dias} días.`,
};

/* La portada, contada con ejemplos y no con párrafos.
 *
 * Arriba la noche: qué es, cuánto cuesta y el catálogo funcionando en el
 * teléfono, con el pedido que llega. Debajo, una cinta con los rubros que corre
 * sola —quien pasa encuentra el suyo sin leer una lista—, la muestra que se
 * toca, los tres pasos dibujados como lo que se ve en cada uno, el directorio
 * con su buscador de verdad, los precios, la tarjeta y las dudas.
 *
 * La paleta del sitio es la noche y el sol, con la cinta de aguayo como firma.
 * La de MiPuesto —el teal— queda para el panel y la tarjeta de acrílico, que es
 * una pieza de la marca sobre la mesa de un cliente. */

/* Desde el 2026-10-22, la primera garantía es la prueba gratis: quince días con
   el catálogo propio, que es lo que saca la duda de «¿me va a servir?». El mes
   gratis se retiró; en su lugar, el segundo mes va por nuestra cuenta al pagar
   el primero (`PROMO_SEGUNDO_MES`). */
const GARANTIAS = [`Prueba gratis de ${PLAN_PRUEBA.dias} días`, "Sin comisión por venta", "Sin contrato"];

/* La acción principal de la portada, que se repite arriba, en el cierre y en
   el botón fijo del teléfono. */
const LLAMADA = `Pruébalo gratis ${PLAN_PRUEBA.dias} días`;

/* Una secuencia de verdad: lo que pasa, en orden, hasta el primer pedido. */
const PASOS = [
  { titulo: "Sácale foto a tu lista", detalle: "O carga producto por producto." },
  { titulo: "Comparte tu enlace", detalle: "En tu estado, tus redes y tu mostrador." },
  { titulo: "Recibe el pedido", detalle: "Con el detalle y el total, en tu WhatsApp." },
];

/* La lista escrita a mano que se vuelve catálogo: el ejemplo del primer paso. */
const LISTA_A_MANO = [
  { nombre: "Salteña de pollo", precio: 7 },
  { nombre: "Api con pastel", precio: 10 },
  { nombre: "Tucumana", precio: 6 },
];

const PREGUNTAS = [
  {
    pregunta: "¿Cómo es la prueba gratis?",
    respuesta: `${describirPrueba()}. No pagas nada ni dejas ningún dato de pago. Si te convence, eliges tu plan y sigues con todo lo que cargaste; si no, tu catálogo deja de verse y listo.`,
  },
  {
    pregunta: "¿Hay alguna promoción?",
    respuesta: `Sí. ${PROMO_SEGUNDO_MES}`,
  },
  {
    pregunta: "¿Mis clientes tienen que instalar algo?",
    respuesta: "No. Abren tu enlace en el navegador del celular, sin crear cuenta.",
  },
  {
    pregunta: "¿Y el catálogo de WhatsApp Business, que es gratis?",
    respuesta:
      "Sirve para pocos productos. Acá tienes dirección propia, QR, buscador, carrito con el total y promociones con fecha. La venta se sigue cerrando en tu WhatsApp.",
  },
  {
    pregunta: "¿La tarjeta de acrílico incluye el catálogo?",
    respuesta: `No. La tarjeta se paga una vez, con diseño, QR y NFC configurados: Bs ${TARJETA_ACRILICO.precioBs} la de mesa y Bs ${TARJETA_ACRILICO_GRANDE.precioBs} la grande. El catálogo es la suscripción mensual, aparte.`,
  },
  /* Los números salen de `lib/planes.ts`, los mismos que aplica la base. */
  {
    pregunta: "¿Cuántos productos y fotos puedo cargar?",
    respuesta: `${PLANES.map(
      (plan) =>
        `Con el plan ${plan.nombre}, hasta ${plan.topes.productos} productos con ${plan.topes.fotosPorProducto} fotos cada uno`,
    ).join("; ")}. Lo que mandas a la papelera no cuenta.`,
  },
  {
    pregunta: "¿Qué pasa si un mes no pago?",
    respuesta:
      "Tu catálogo deja de verse, pero no se borra nada durante noventa días. Al reanudar vuelve tal cual.",
  },
  {
    pregunta: "¿Sirve si vendo servicios?",
    respuesta: "Sí. En vez de carrito, tus clientes reservan hora: barberías, consultorios, talleres.",
  },
];

/* Las lecturas de foto de cada plan, del mismo lugar que las cobra el sistema:
   si la portada dijera otro número, el reclamo llega por WhatsApp y con razón. */
const LECTURAS = Object.fromEntries(PLANES.map((plan) => [plan.id, plan.lecturasPorMes]));

/* La cinta de rubros: el nombre corto, sin la segunda mitad («Pollería y
   broaster» pasa a «Pollería»), que en una cinta que corre se lee de un vistazo. */
const RUBROS_EN_CINTA = RUBROS_PUBLICOS.filter(({ id }) => id !== "otro").map(({ id, nombre }) => ({
  id,
  nombre: nombre.split(" y ")[0],
  icono: ICONO_DE_RUBRO[id],
}));

export default function Inicio() {
  const enlaceAlta = construirEnlaceContacto(
    `Hola, quiero probar MiPuesto gratis ${PLAN_PRUEBA.dias} días.`,
  );
  const enlaceTarjeta = construirEnlaceContacto(
    "Hola, quiero la tarjeta de acrílico con QR y NFC para mi negocio.",
  );

  /* Un QR de verdad: quien mira la portada en la computadora lo escanea y
     termina recorriendo catálogos reales, que es lo que hace la tarjeta en una
     mesa. */
  const qrDirectorio = qrComoSvg(
    new URL("/directorio", obtenerUrlBaseSitio()).toString(),
    "Código QR que abre el directorio de catálogos de MiPuesto",
  );

  return (
    <>
      {/* La marca se presenta antes de la portada, una vez por sesión. Va fuera
          del `main` para que nada de adentro pueda encerrar su posición fija. */}
      <Introduccion />
      <CabeceraSitio actual="inicio" />

      <main className={styles.pagina}>
        {/* 1 · Qué es y cuánto cuesta, con el catálogo funcionando al lado. */}
        <section className={styles.portada}>
          <div className={styles.portadaContenido}>
            <div className={styles.discurso}>
              <h1>Tu negocio, abierto en el celular de tus caseros</h1>
              <p className={styles.promesa}>
                Tus productos con foto y precio. Te eligen, y el pedido te llega por WhatsApp.
              </p>
              <div className={styles.acciones}>
                <a className={styles.botonSol} href={enlaceAlta} rel="noreferrer" target="_blank">
                  {LLAMADA}
                </a>
                <Link className={styles.botonContorno} href="/directorio">
                  Ver negocios reales
                </Link>
              </div>
              {/* El precio arriba y no escondido al final: quien no lo encuentra
                  supone que es caro y se va. */}
              <p className={styles.precioAncla}>
                Desde <strong>Bs {PRECIO_MENSUAL_BS}</strong> al mes
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

            <div className={styles.escena}>
              <VitrinaPortada />
              {/* Lo que le pasa al dueño mientras el cliente mira: dos avisos de
                  ejemplo, flotando junto al teléfono. Son decorado: lo mismo
                  está dicho en texto en los pasos. */}
              <div aria-hidden="true" className={styles.avisoPedido}>
                <span className={styles.avisoIcono}>
                  <Icono nombre="carrito" />
                </span>
                <span>
                  <strong>Nuevo pedido</strong>
                  <small>2 salteñas y 1 api, Bs 24</small>
                </span>
              </div>
              <div aria-hidden="true" className={styles.avisoBusqueda}>
                <span className={styles.avisoIcono}>
                  <Icono nombre="lupa" />
                </span>
                <span>
                  <strong>Te encontraron</strong>
                  <small>buscando «salteñas»</small>
                </span>
              </div>
            </div>
          </div>
          <div aria-hidden="true" className={styles.cinta} />
        </section>

        {/* 2 · Para quién es, sin decirlo: los rubros pasando. La segunda copia
            es la que hace que la cinta no tenga fin, y no se lee dos veces. */}
        <section aria-label="Rubros que ya pueden tener su catálogo" className={styles.rubros}>
          <div className={styles.pista}>
            <ul>
              {RUBROS_EN_CINTA.map(({ id, nombre, icono }) => (
                <li key={id}>
                  <IconoCatalogo nombre={icono} />
                  {nombre}
                </li>
              ))}
            </ul>
            <ul aria-hidden="true">
              {RUBROS_EN_CINTA.map(({ id, nombre, icono }) => (
                <li key={id}>
                  <IconoCatalogo nombre={icono} />
                  {nombre}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 3 · La prueba: el catálogo de verdad, con el rubro de quien mira. */}
        <section aria-labelledby="asi-se-ve" className={styles.seccion}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
              <h2 id="asi-se-ve">Así lo ve tu cliente</h2>
              <p>Toca tu rubro. No es una captura: es el catálogo de verdad.</p>
            </div>
            <MuestraPlantillas />
          </div>
        </section>

        {/* 4 · Cómo se arma, con lo que se ve en cada paso en vez de explicarlo. */}
        <section aria-labelledby="como-funciona" className={styles.seccionSuave}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
              <h2 id="como-funciona">Listo en una tarde</h2>
            </div>
            <ol className={styles.pasos}>
              {PASOS.map(({ titulo, detalle }, indice) => (
                <li key={titulo}>
                  <div aria-hidden="true" className={styles.ejemplo}>
                    {indice === 0 ? (
                      <div className={styles.papel}>
                        {LISTA_A_MANO.map(({ nombre, precio }) => (
                          <p key={nombre}>
                            <span>{nombre}</span>
                            <span>{precio}</span>
                          </p>
                        ))}
                        <span className={styles.selloIa}>
                          <Icono nombre="rayo" />
                          Se carga sola
                        </span>
                      </div>
                    ) : indice === 1 ? (
                      <div className={styles.compartir}>
                        <p className={styles.enlaceMuestra}>
                          <Icono nombre="enlace" />
                          {DOMINIO_MIPUESTO}/dona-rosa
                        </p>
                        <div className={styles.canales}>
                          <span>
                            <Icono nombre="codigoQr" />
                            QR
                          </span>
                          <span>
                            <Icono nombre="telefono" />
                            Estado
                          </span>
                          <span>
                            <Icono nombre="mundo" />
                            Redes
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.chat}>
                        <p className={styles.globo}>
                          Hola, quiero:
                          <br />2 × Salteña de pollo, Bs 14
                          <br />1 × Api con pastel, Bs 10
                          <br />
                          <strong>Total: Bs 24</strong>
                        </p>
                        <p className={styles.globoDueno}>¡Listo, en 20 minutos!</p>
                      </div>
                    )}
                  </div>
                  <div className={styles.pasoTexto}>
                    <span aria-hidden="true" className={styles.numero}>
                      {indice + 1}
                    </span>
                    <div>
                      <h3>{titulo}</h3>
                      <p>{detalle}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 5 · Las herramientas de IA, en dos ejemplos: lo que entra y lo que
            sale. El texto es el mínimo; lo explican los dibujos. */}
        <section aria-labelledby="con-ia" className={styles.seccion}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
              <p className={styles.selloSeccionIa}>
                <Icono nombre="rayo" />
                Herramientas de IA
              </p>
              <h2 id="con-ia">Una foto, y tu catálogo se carga solo</h2>
            </div>
            <div className={styles.ia}>
              <article className={styles.iaEjemplo}>
                <div aria-hidden="true" className={styles.iaDibujo}>
                  <div className={styles.papel}>
                    {LISTA_A_MANO.map(({ nombre, precio }) => (
                      <p key={nombre}>
                        <span>{nombre}</span>
                        <span>{precio}</span>
                      </p>
                    ))}
                  </div>
                  <span className={styles.iaMarca}>
                    <Icono nombre="rayo" />
                  </span>
                  <ul className={styles.iaProductos}>
                    {LISTA_A_MANO.map(({ nombre, precio }) => (
                      <li key={nombre}>
                        <span>{nombre}</span>
                        <strong>Bs {precio}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
                <h3>Tu lista de precios</h3>
                <p>Escrita a mano o impresa: sale separada producto por producto.</p>
              </article>
              <article className={styles.iaEjemplo}>
                <div aria-hidden="true" className={styles.iaDibujo}>
                  <Image
                    alt=""
                    className={styles.iaFoto}
                    height={112}
                    src="/demo/productos/hamburguesa.webp"
                    width={112}
                  />
                  <span className={styles.iaMarca}>
                    <Icono nombre="rayo" />
                  </span>
                  <div className={styles.iaFicha}>
                    <strong>Hamburguesa de la casa</strong>
                    <span>Doble carne, queso, vegetales frescos y salsa de la casa.</span>
                  </div>
                </div>
                <h3>La foto de un producto</h3>
                <p>Se completan el nombre y la descripción.</p>
              </article>
            </div>
            <p className={styles.iaNota}>
              Revisas todo antes de publicar y el precio lo pones vos.{" "}
              <strong>
                {LECTURAS.catalogo} fotos al mes en Catálogo, {LECTURAS.activo} en Catálogo Activo.
              </strong>
            </p>
          </div>
        </section>

        {/* 6 · El directorio, con su buscador de verdad: se prueba acá mismo. */}
        <section aria-labelledby="te-encuentran" className={styles.encontrar}>
          <div className={styles.encontrarContenido}>
            <div className={styles.encabezadoNoche}>
              <h2 id="te-encuentran">Y te encuentran por lo que vendes</h2>
              <p>Todos los catálogos aparecen en el directorio. Prueba buscar algo:</p>
            </div>
            <BuscadorVivo ejemplos={EJEMPLOS_DE_BUSQUEDA} tamano="grande" />
            <ul className={styles.atajos}>
              {BUSQUEDAS_POPULARES.map(({ texto, icono }) => (
                <li key={texto}>
                  <Link href={`/directorio?q=${encodeURIComponent(texto)}`}>
                    <IconoCatalogo nombre={icono} />
                    {texto}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 7 · El precio. Dos planes y, aparte, lo que se paga una sola vez. */}
        <section aria-labelledby="precio" className={styles.seccion}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
              <h2 id="precio">Precios claros, en bolivianos</h2>
              <p>
                Se paga mes a mes, sin contrato. Antes de pagar, pruébalo gratis {PLAN_PRUEBA.dias} días.
              </p>
              <p>
                <strong>{PROMO_SEGUNDO_MES}</strong>
              </p>
            </div>

            <div className={styles.planes}>
              {PLANES.map((plan) => (
                <article className={plan.destacado ? styles.planDestacado : styles.plan} key={plan.id}>
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
                    className={plan.destacado ? styles.botonSol : styles.botonNoche}
                    href={construirEnlaceContacto(`Hola, quiero probar el plan ${plan.nombre} de MiPuesto.`)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Empezar con este
                  </a>
                </article>
              ))}
            </div>

            {/* Filas y no tarjetas: se pagan una vez, y presentarlos como un
                tercer y cuarto plan obligaría a comparar cuatro cuando la
                decisión es entre dos. */}
            <div className={styles.extras}>
              <h3>Aparte, y una sola vez</h3>
              <ul>
                <li>
                  <span className={styles.extraIcono}>
                    <Icono nombre="documento" />
                  </span>
                  <div>
                    <p className={styles.extraNombre}>Te cargamos el catálogo</p>
                    <p>Nos mandas tu lista, hasta {CARGA_INICIAL.productosMaximos} productos.</p>
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
                  <span className={styles.extraIcono}>
                    <Icono nombre="nfc" />
                  </span>
                  <div>
                    <p className={styles.extraNombre}>{TARJETA_ACRILICO.nombre} con QR y NFC</p>
                    <p>Con tu diseño. {TARJETA_ACRILICO.medidas}.</p>
                  </div>
                  <p className={styles.extraPrecio}>
                    Bs {TARJETA_ACRILICO.precioBs}
                    <span>por tarjeta</span>
                  </p>
                  <a href="#tarjeta">Verla</a>
                </li>
                <li>
                  <span className={styles.extraIcono}>
                    <Icono nombre="nfc" />
                  </span>
                  <div>
                    <p className={styles.extraNombre}>{TARJETA_ACRILICO_GRANDE.nombre} con QR y NFC</p>
                    <p>En porta-carteles para el mostrador. {TARJETA_ACRILICO_GRANDE.medidas}.</p>
                  </div>
                  <p className={styles.extraPrecio}>
                    Bs {TARJETA_ACRILICO_GRANDE.precioBs}
                    <span>por tarjeta</span>
                  </p>
                  <a href="#tarjeta">Verla</a>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 8 · La tarjeta: el catálogo sale del teléfono y se sienta en la mesa. */}
        <section aria-labelledby="tarjeta" className={styles.seccionTarjeta}>
          <div className={styles.tarjetaContenido}>
            <div className={styles.tarjetaTexto}>
              <h2 id="tarjeta">Tu catálogo, sobre la mesa</h2>
              <ul className={styles.tarjetaBeneficios}>
                <li>
                  <Icono nombre="codigoQr" />
                  <span>
                    <strong>Escanean o acercan el celular</strong> y abren tu catálogo.
                  </span>
                </li>
                <li>
                  <Icono nombre="estrella" />
                  <span>
                    <strong>Te califican en Google Maps</strong> y apareces más arriba.
                  </span>
                </li>
                <li>
                  <Icono nombre="paleta" />
                  <span>
                    <strong>Con tu logo y tus colores.</strong> La configuramos nosotros.
                  </span>
                </li>
              </ul>
              {/* Las dos, con su medida al lado del precio: quien tiene poco
                  mostrador decide por el tamaño antes que por la plata. */}
              <ul className={styles.tarjetaPrecios}>
                {[TARJETA_ACRILICO, TARJETA_ACRILICO_GRANDE].map((tarjeta) => (
                  <li key={tarjeta.nombre}>
                    <strong>Bs {tarjeta.precioBs}</strong>
                    <span>
                      {tarjeta.nombre}
                      <small>{tarjeta.medidas}</small>
                    </span>
                  </li>
                ))}
              </ul>
              <p className={styles.tarjetaNota}>Precio por tarjeta. No incluye el mes del catálogo.</p>
              <a className={styles.botonClaro} href={enlaceTarjeta} rel="noreferrer" target="_blank">
                Quiero mi tarjeta
              </a>
            </div>

            {/* Las dos tarjetas dibujadas, una al lado de la otra y a escala: la
                grande mide 21 cm de alto contra 17,5, y se ve. Se las describe
                enteras para quien no las ve. */}
            <figure className={styles.acrilicos}>
              <div className={styles.parAcrilicos}>
                <div className={styles.acrilico}>
                  <div className={styles.acrilicoPlaca}>
                    <div className={styles.impreso}>
                      <p className={styles.impresoNegocio}>Tu negocio</p>
                      <p className={styles.impresoLlamada}>Mira nuestro catálogo</p>
                      <div className={styles.impresoQr} dangerouslySetInnerHTML={{ __html: qrDirectorio }} />
                      <p className={styles.impresoNfc}>
                        <Icono nombre="nfc" />o acerca tu celular
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
                          Califícanos en Google Maps
                        </span>
                      </div>
                      <p className={styles.impresoMarca}>
                        <Isotipo className={styles.impresoIsotipo} />
                        MiPuesto
                      </p>
                    </div>
                  </div>
                  <div aria-hidden="true" className={styles.acrilicoBase} />
                  <p className={styles.acrilicoMedida}>
                    {TARJETA_ACRILICO.nombre} · {TARJETA_ACRILICO.medidas}
                  </p>
                </div>

                {/* La grande, en porta-carteles en L: la placa apenas inclinada hacia
                    atrás y el pie doblado hacia adelante. Mismo diseño que la de mesa,
                    ordenado como el cartel que se mira de más lejos: la llamada
                    arriba y grande, el NFC y el QR al centro, y la marca al pie. */}
                <div className={styles.acrilicoGrande}>
                  <div className={styles.acrilicoPlaca}>
                    <div className={styles.impresoGrande}>
                      <p className={styles.impresoNegocio}>Tu negocio</p>
                      <div className={styles.impresoTitulo}>
                        <span>Abre nuestro</span>
                        <strong>Catálogo digital</strong>
                      </div>
                      <p className={styles.impresoAcerca}>
                        <Icono nombre="nfc" />
                        Acerca tu celular aquí
                      </p>
                      <div className={styles.impresoCentro}>
                        <p className={styles.impresoVentaja}>
                          <Icono nombre="documento" />
                          Menú actualizado
                        </p>
                        <div className={styles.impresoQrGrande}>
                          <div dangerouslySetInnerHTML={{ __html: qrDirectorio }} />
                          <span>Escanea el QR</span>
                        </div>
                        <p className={styles.impresoVentaja}>
                          <Icono nombre="telefono" />
                          Pedido fácil por celular
                        </p>
                      </div>
                      <div className={styles.impresoFranja}>
                        <span>Catálogo y experiencia digital impulsados por</span>
                        <strong>
                          <Isotipo className={styles.impresoIsotipo} />
                          MiPuesto
                        </strong>
                        <span>{DOMINIO_MIPUESTO}</span>
                      </div>
                    </div>
                  </div>
                  <div aria-hidden="true" className={styles.pieEnL} />
                  <p className={styles.acrilicoMedida}>
                    {TARJETA_ACRILICO_GRANDE.nombre} · {TARJETA_ACRILICO_GRANDE.medidas}
                  </p>
                </div>
              </div>
              <figcaption>
                Escanea cualquiera de los dos QR: abren catálogos de negocios reales.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* 9 · Las dudas que quedan, donde las busca quien las tiene. */}
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

        {/* 10 · El cierre, con la misma acción que la portada. */}
        <section aria-labelledby="cierre" className={styles.cierre}>
          <div className={styles.cierreContenido}>
            <Isotipo className={styles.isotipoCierre} titulo="MiPuesto" />
            <h2 id="cierre">
              Pruébalo {PLAN_PRUEBA.dias} días sin pagar nada
            </h2>
            <p>
              Escríbenos y te abrimos tu prueba: hasta {PLAN_PRUEBA.topes.productos} productos y{" "}
              {PLAN_PRUEBA.lecturasPorMes} lecturas con IA. Si te convence, {PROMO_SEGUNDO_MES.charAt(0).toLowerCase() + PROMO_SEGUNDO_MES.slice(1)}
            </p>
            <a className={styles.botonNoche} href={enlaceAlta} rel="noreferrer" target="_blank">
              {LLAMADA}
            </a>
          </div>
        </section>

        <div className={styles.accionFija}>
          <a className={styles.botonSol} href={enlaceAlta} rel="noreferrer" target="_blank">
            {LLAMADA}
          </a>
        </div>
      </main>
      <PieSitio />
    </>
  );
}
