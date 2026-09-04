import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { MuestraPlantillas } from "../components/inicio/muestra-plantillas";
import { PRECIO_MENSUAL_BS, construirEnlaceContacto } from "../lib/contacto";
import styles from "./inicio.module.css";

export const metadata: Metadata = {
  title: "MiPuesto, tu catálogo digital por WhatsApp",
  description: `Catálogo propio para tu negocio, con pedidos que se cierran por WhatsApp. Bs ${PRECIO_MENSUAL_BS} al mes y el primer mes gratis.`,
};

const PASOS = [
  {
    titulo: "Cargás tus productos",
    detalle: "Foto, nombre y precio. Podés hacerlo desde el celular, entre cliente y cliente.",
  },
  {
    titulo: "Elegís cómo se ve",
    detalle: "Tres estructuras y cuatro colores. Cambiarlo después no toca tus productos.",
  },
  {
    titulo: "Compartís tu enlace",
    detalle: "Un link y un código QR para imprimir. El pedido te llega por WhatsApp.",
  },
];

const INCLUYE = [
  "Catálogo propio con tu dirección web",
  "Código QR para imprimir y pegar en tu puesto",
  "Pedidos y reservas que llegan por WhatsApp",
  "Control de existencias y promociones",
  "Cuántas personas te visitan cada semana",
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
      "Sí. Una de las tres estructuras está pensada para servicios con turno: barberías, consultorios, talleres. En vez de carrito, tus clientes reservan.",
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
    <main className={styles.pagina}>
      <header className={styles.portada}>
        <Image
          alt="MiPuesto"
          className={styles.logotipo}
          height={390}
          priority
          src="/marca/mipuesto-completo.png"
          width={560}
        />
        <h1>Tu puesto, en el celular de tus clientes</h1>
        <p className={styles.promesa}>
          Un catálogo propio para mostrar lo que vendés, con precios al día y pedidos que
          te llegan por WhatsApp. Sin comisiones por venta.
        </p>
        <div className={styles.acciones}>
          <a href={enlaceAlta} rel="noreferrer" target="_blank">
            Quiero mi catálogo
          </a>
          <Link href="/directorio">Ver negocios que ya lo usan</Link>
        </div>
        <p className={styles.precioPortada}>
          Bs {PRECIO_MENSUAL_BS} al mes. El primer mes es gratis.
        </p>
      </header>

      <section aria-labelledby="como-funciona" className={styles.pasos}>
        <h2 id="como-funciona">Cómo se pone en marcha</h2>
        <ol>
          {PASOS.map(({ titulo, detalle }) => (
            <li key={titulo}>
              <h3>{titulo}</h3>
              <p>{detalle}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="asi-se-ve" className={styles.demostracion}>
        <div className={styles.tituloDemostracion}>
          <h2 id="asi-se-ve">Así se ve tu catálogo</h2>
          <p>
            Probá las combinaciones. Cada estructura nació de un rubro distinto, así que
            no cambian solo de color.
          </p>
        </div>
        <MuestraPlantillas />
      </section>

      <section aria-labelledby="precio" className={styles.precio}>
        <div>
          <h2 id="precio">Bs {PRECIO_MENSUAL_BS} al mes</h2>
          <p>El primer mes es gratis. Sin contrato y sin comisión por venta.</p>
          <ul>
            {INCLUYE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <a href={enlaceAlta} rel="noreferrer" target="_blank">
            Escribinos por WhatsApp
          </a>
          <p className={styles.aclaracion}>
            La cuenta se abre conversando con nosotros. Te ayudamos a cargar los primeros
            productos.
          </p>
        </div>
      </section>

      <section aria-labelledby="preguntas" className={styles.preguntas}>
        <h2 id="preguntas">Preguntas frecuentes</h2>
        <dl>
          {PREGUNTAS.map(({ pregunta, respuesta }) => (
            <div key={pregunta}>
              <dt>{pregunta}</dt>
              <dd>{respuesta}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
