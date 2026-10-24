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
  PLAN_ANUAL,
  PLAN_PRUEBA,
  PLANES,
  PROMO_SEGUNDO_MES,
  TARJETA_ACRILICO,
  TARJETA_ACRILICO_GRANDE,
  ahorroAnualBs,
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
  { titulo: "Sácale foto a tu lista", detalle: "La IA arma tus productos. O los cargas uno por uno." },
  { titulo: "Comparte tu enlace", detalle: "En tu estado, tus redes y tu mostrador." },
  { titulo: "Recibe el pedido", detalle: "Con el detalle y el total, en tu WhatsApp." },
];

/* La lista escrita a mano que se vuelve catálogo: el ejemplo del primer paso. */
const LISTA_A_MANO = [
  { nombre: "Salteña de pollo", precio: 7 },
  { nombre: "Api con pastel", precio: 10 },
  { nombre: "Tucumana", precio: 6 },
];

/* La escena grande de IA: la lista con sus títulos de sección, un renglón con
   dos tamaños y un precio borroneado, que son las tres cosas que la lectura
   resuelve —o marca— sola. Lo leído es lo que muestra de verdad «Revisa antes
   de crear»: el dudoso queda sin elegir, por eso se crean cuatro y no cinco. */
const LISTA_CON_SECCIONES = [
  {
    seccion: "Salteñas",
    renglones: [
      { escrito: "Salteña de pollo", precio: "7" },
      { escrito: "Salteña de carne", precio: "7" },
    ],
  },
  {
    seccion: "Bebidas",
    renglones: [
      { escrito: "Mocochinchi", precio: "4" },
      { escrito: "Refresco chico/grande", precio: "5/9" },
      { escrito: "Api morado", precio: "6", borroso: true },
    ],
  },
];

const LISTA_LEIDA = [
  {
    categoria: "Salteñas",
    productos: [
      { nombre: "Salteña de pollo", precio: "Bs 7" },
      { nombre: "Salteña de carne", precio: "Bs 7" },
    ],
  },
  {
    categoria: "Bebidas",
    productos: [
      { nombre: "Mocochinchi", precio: "Bs 4" },
      { nombre: "Refresco", opciones: ["Chico Bs 5", "Grande Bs 9"] },
      { nombre: "Api morado", precio: "Bs 6", dudoso: true },
    ],
  },
];

/* Lo que hace con la lista, dicho como lo ve el dueño en la revisión. Cada
   renglón tiene su ejemplo en el dibujo de al lado. */
const LO_QUE_HACE_LA_IA = [
  "Separa cada renglón en un producto, con su precio en bolivianos.",
  "Los títulos de tu lista, como «Salteñas» o «Bebidas», pasan a ser tus categorías.",
  "Lo que viene en tamaños o tallas queda como un solo producto con sus opciones.",
  "Lo que no se lee bien queda marcado y sin elegir, para que lo corrijas.",
];

/* Las lecturas de foto de cada plan, del mismo lugar que las cobra el sistema:
   si la portada dijera otro número, el reclamo llega por WhatsApp y con razón.
   Va antes de las preguntas, que también las nombran. */
const LECTURAS = Object.fromEntries(PLANES.map((plan) => [plan.id, plan.lecturasPorMes]));

const PREGUNTAS = [
  {
    pregunta: "¿Cómo es la prueba gratis?",
    respuesta: `${describirPrueba()}. No pagas nada ni dejas ningún dato de pago. Si te convence, eliges tu plan y sigues con todo lo que cargaste; si no, tu catálogo deja de verse y listo.`,
  },
  {
    pregunta: "¿Hay alguna promoción?",
    respuesta: `Sí. ${PROMO_SEGUNDO_MES}`,
  },
  /* Lo que pasa después de escribir, dicho antes de que lo pregunten: quien no
     sabe cómo se paga ni cuándo empieza, no escribe (respuestas del dueño,
     2026-10-22). */
  {
    pregunta: "¿Cuánto tarda en estar lista mi cuenta?",
    respuesta:
      "El mismo día. Nos escribes por WhatsApp, te habilitamos la prueba y empiezas a cargar tus productos.",
  },
  {
    pregunta: "¿Cómo se paga?",
    respuesta:
      "Con QR, desde la aplicación de tu banco. Lo coordinamos por WhatsApp y, si prefieres, nos reunimos en persona o por videollamada para mostrarte el sistema antes.",
  },
  {
    pregunta: "¿Emiten factura?",
    respuesta: "Por ahora no emitimos factura. El pago es directo, con QR.",
  },
  /* Las dos dudas de la IA que la sección no alcanza a cerrar: qué es una
     lectura y qué pasa si lee mal. */
  {
    pregunta: "¿Qué es una lectura con IA?",
    respuesta: `Cada vez que la IA lee una foto o un PDF. Una lista entera, aunque tenga varias páginas, gasta una sola. La foto de un producto también gasta una. Tienes ${PLAN_PRUEBA.lecturasPorMes} en la prueba gratis, ${LECTURAS.catalogo} al mes en Catálogo y ${LECTURAS.activo} en Catálogo Activo.`,
  },
  {
    pregunta: "¿Y si la IA lee mal un precio?",
    respuesta:
      "Lo que no se lee con seguridad queda marcado y sin elegir. Igual ves cada producto con su precio antes de crearlo, y lo corriges ahí mismo o después desde Productos.",
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

/* La cinta de rubros: el nombre corto, sin la segunda mitad («Pollería y
   broaster» pasa a «Pollería»), que en una cinta que corre se lee de un vistazo. */
const RUBROS_EN_CINTA = RUBROS_PUBLICOS.filter(({ id }) => id !== "otro").map(({ id, nombre }) => ({
  id,
  nombre: nombre.split(" y ")[0],
  icono: ICONO_DE_RUBRO[id],
}));

export default function Inicio() {
  /* Todo botón de contratar lleva a `/empezar`, con la opción elegida: ahí
     está todo lo que incluye y el formulario corto que arma el WhatsApp. */
  const enlaceAlta = "/empezar?opcion=prueba";
  const enlaceTarjeta = construirEnlaceContacto(
    "Hola, quiero la tarjeta de acrílico con QR y NFC para mi negocio.",
  );

  /* Un QR de verdad: quien mira la portada en la computadora lo escanea y
     termina recorriendo el directorio, que es lo que hace la tarjeta en una
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
                <Link className={styles.botonSol} href={enlaceAlta}>
                  {LLAMADA}
                </Link>
                {/* «Ejemplos», no negocios en funcionamiento: hasta el piloto, los
                    catálogos del directorio son de demostración, y quien
                    escribiera a uno descubriría que no existe (2026-10-22). */}
                <Link className={styles.botonContorno} href="/directorio">
                  Ver ejemplos
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
                          La lee la IA
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

        {/* 5 · Las herramientas de IA.
            Antes eran dos dibujos de «entra esto, sale esto» y no quedaba claro
            qué hacía la IA ni qué le tocaba al dueño (2026-10-24). Ahora va la
            escena entera, en el orden en que pasa: la lista en papel, la lectura
            y la pantalla «Revisa antes de crear» tal como la ve en el panel. Al
            lado, qué resuelve sola; debajo, las otras dos ayudas y lo que la IA
            no hace, que es lo que da confianza para probarla. */}
        <section aria-labelledby="con-ia" className={styles.seccion}>
          <div className={styles.seccionContenido}>
            <div className={styles.encabezado}>
              <p className={styles.selloSeccionIa}>
                <Icono nombre="rayo" />
                Herramientas de IA
              </p>
              <h2 id="con-ia">Le sacas foto a tu lista y la IA te arma el catálogo</h2>
              <p>
                Sirve la lista escrita a mano, la impresa o el PDF de tu proveedor. La IA separa cada
                producto con su precio, y vos revisas todo antes de publicar.
              </p>
            </div>

            <div className={styles.iaGuia}>
              {/* Una secuencia de verdad, por eso lleva números: lo que haces,
                  lo que hace la IA y lo que haces de nuevo. Los dibujos se
                  esconden del lector de pantalla; los pasos y la lista de al
                  lado dicen lo mismo con palabras. */}
              <ol className={styles.iaRecorrido}>
                <li>
                  <div aria-hidden="true" className={styles.iaCuadro}>
                    <div className={styles.papelSecciones}>
                      {LISTA_CON_SECCIONES.map(({ seccion, renglones }) => (
                        <div key={seccion}>
                          <p className={styles.papelTitulo}>{seccion}</p>
                          {renglones.map(({ escrito, precio, borroso }) => (
                            <p key={escrito}>
                              <span>{escrito}</span>
                              <span className={borroso ? styles.borroso : undefined}>{precio}</span>
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className={styles.iaPaso}>
                    <span aria-hidden="true" className={styles.numero}>
                      1
                    </span>
                    Le sacas foto a tu lista, o subes el PDF
                  </p>
                </li>
                <li>
                  <div aria-hidden="true" className={styles.iaLeyendo}>
                    <span className={styles.iaMarca}>
                      <Icono nombre="rayo" />
                    </span>
                    <span className={styles.iaLeyendoTexto}>Leyendo tu lista…</span>
                  </div>
                  <p className={styles.iaPaso}>
                    <span aria-hidden="true" className={styles.numero}>
                      2
                    </span>
                    La IA la lee en segundos
                  </p>
                </li>
                <li>
                  <div aria-hidden="true" className={styles.iaCuadro}>
                    <div className={styles.telefono}>
                      <div className={styles.pantalla}>
                        <p className={styles.pantallaTitulo}>Revisa antes de crear</p>
                        {LISTA_LEIDA.map(({ categoria, productos }) => (
                          <div className={styles.pantallaGrupo} key={categoria}>
                            <p className={styles.pantallaCategoria}>
                              <Icono nombre="carpeta" />
                              {categoria}
                            </p>
                            {productos.map(({ nombre, precio, opciones, dudoso }) => (
                              <div className={dudoso ? styles.leidoDudoso : styles.leido} key={nombre}>
                                <span className={dudoso ? styles.casillaVacia : styles.casilla}>
                                  {dudoso ? null : <Icono nombre="listo" />}
                                </span>
                                <span className={styles.leidoNombre}>{nombre}</span>
                                {precio ? <strong>{precio}</strong> : null}
                                {opciones ? (
                                  <span className={styles.leidoOpciones}>
                                    {opciones.map((opcion) => (
                                      <span key={opcion}>{opcion}</span>
                                    ))}
                                  </span>
                                ) : null}
                                {dudoso ? <span className={styles.leidoRevisa}>revisa</span> : null}
                              </div>
                            ))}
                          </div>
                        ))}
                        <span className={styles.pantallaBoton}>Crear 4 productos</span>
                      </div>
                    </div>
                  </div>
                  <p className={styles.iaPaso}>
                    <span aria-hidden="true" className={styles.numero}>
                      3
                    </span>
                    Revisas, corriges y tocas Crear
                  </p>
                </li>
              </ol>

              <div className={styles.iaHace}>
                <h3>Qué hace con tu lista</h3>
                <ul>
                  {LO_QUE_HACE_LA_IA.map((cosa) => (
                    <li key={cosa}>
                      <Icono nombre="listo" />
                      {cosa}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <h3 className={styles.iaTambien}>Y también te ayuda con</h3>
            <div className={styles.ia}>
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
                <h4>La foto de un producto</h4>
                <p>
                  Desde Productos, le sacas foto y la IA propone el nombre, la descripción y la
                  categoría. El precio lo pones vos.
                </p>
              </article>
              <article className={styles.iaEjemplo}>
                <div aria-hidden="true" className={styles.iaDibujo}>
                  {/* Una que cumple las reglas de `lib/ia/descripciones.ts`: solo
                      con el nombre y la categoría, sin ingredientes que el
                      renglón no dice. Si la portada mostrara una más rica que
                      las que salen, prometería lo que la IA tiene prohibido. */}
                  <div className={styles.iaFicha}>
                    <strong>Mocochinchi</strong>
                    <span className={styles.iaVacio}>Sin descripción</span>
                  </div>
                  <span className={styles.iaMarca}>
                    <Icono nombre="rayo" />
                  </span>
                  <div className={styles.iaFicha}>
                    <strong>Mocochinchi</strong>
                    <span>Mocochinchi de la casa, para acompañar tu pedido.</span>
                    <span className={styles.iaSugerida}>Sugerida</span>
                  </div>
                </div>
                <h4>Las descripciones que faltan</h4>
                <p>
                  Si tu lista o tu Excel trae solo nombres, escribe una frase corta con lo que dice
                  cada renglón, sin inventar. Quedan marcadas como sugeridas hasta que las lees.
                </p>
              </article>
            </div>

            {/* Lo que la IA no hace y lo que cuesta, al final de la sección y con
                los números de `lib/planes.ts`: la duda que frena a probarla es
                «¿y si inventa?» y la segunda, «¿me alcanza?». Una lista entera
                gasta una sola lectura, y sin decirlo diez al mes parecían diez
                productos. */}
            <div className={styles.iaNota}>
              <p>
                <strong>No inventa ni publica sola.</strong> Lo que no se lee, no lo pone, y nada
                aparece en tu catálogo hasta que tocas Crear.
              </p>
              <p>
                <strong>Una foto o un PDF es una lectura, aunque traiga la lista entera.</strong>{" "}
                {PLAN_PRUEBA.lecturasPorMes} en la prueba gratis, {LECTURAS.catalogo} al mes en
                Catálogo y {LECTURAS.activo} en Catálogo Activo. Importar tu Excel no gasta ninguna.
              </p>
            </div>
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
                  {/* Las dos llevan su sello de IA: con uno solo parecía que el
                      plan Catálogo no la tenía, y trae diez lecturas al mes. */}
                  <p className={styles.sello}>{plan.etiquetaIa}</p>
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
                  <Link
                    className={plan.destacado ? styles.botonSol : styles.botonNoche}
                    href={`/empezar?opcion=${plan.id}`}
                  >
                    Empezar con este
                  </Link>
                </article>
              ))}
            </div>

            {/* El año, debajo de los dos planes y no como un tercero: es el mismo
                plan Catálogo, pagado de una vez. */}
            <div className={styles.anual}>
              <p>
                <strong>¿Prefieres pagar el año?</strong> El plan Catálogo por doce meses, Bs{" "}
                {PLAN_ANUAL.precioBs}: ahorras Bs {ahorroAnualBs()}.
              </p>
              <Link className={styles.botonNoche} href="/empezar?opcion=anual">
                Elegir el año
              </Link>
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
                Escanea cualquiera de los dos QR: abren el directorio, con catálogos de ejemplo.
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
            <Link className={styles.botonNoche} href={enlaceAlta}>
              {LLAMADA}
            </Link>
          </div>
        </section>

        <div className={styles.accionFija}>
          <Link className={styles.botonSol} href={enlaceAlta}>
            {LLAMADA}
          </Link>
        </div>
      </main>
      <PieSitio />
    </>
  );
}
