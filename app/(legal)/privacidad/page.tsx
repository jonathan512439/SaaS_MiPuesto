import type { Metadata } from "next";

import { WHATSAPP_MIPUESTO, construirEnlaceContacto } from "../../../lib/contacto";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacidad | MiPuesto",
  description: "Qué datos guarda MiPuesto, para qué los usa y cómo pedir que se borren.",
};

const VIGENCIA = "4 de septiembre de 2026";

export default function PaginaPrivacidad() {
  return (
    <main className={styles.pagina}>
      <header className={styles.encabezado}>
        <h1>Privacidad</h1>
        <p className={styles.vigencia}>Vigente desde el {VIGENCIA}.</p>
      </header>

      <section className={styles.seccion}>
        <h2>Quiénes somos</h2>
        <p>
          MiPuesto es un servicio boliviano que permite a un negocio publicar su catálogo
          y recibir pedidos por WhatsApp. Lo desarrolla y opera JC-DEV. Podés escribirnos
          al {WHATSAPP_MIPUESTO.slice(3)} por cualquier consulta sobre tus datos.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Datos del negocio que contrata</h2>
        <p>
          Para abrir tu cuenta guardamos tu correo electrónico y los datos que cargás de
          tu negocio: nombre, descripción, rubro, horario, teléfono de WhatsApp, enlaces
          a tus redes, tu logotipo y tu código QR de cobro si lo subís.
        </p>
        <p>
          Tu contraseña no la guardamos ni la vemos. La administra Supabase, el
          proveedor de base de datos, en forma cifrada.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Datos de quienes te compran</h2>
        <p>
          Cuando una persona hace un pedido en tu catálogo, guardamos únicamente lo que
          escribe en el formulario:
        </p>
        <ul>
          <li>Su nombre, si decide escribirlo. Es opcional.</li>
          <li>Su teléfono, si decide escribirlo. También es opcional.</li>
          <li>Los productos, cantidades y precios de ese pedido.</li>
        </ul>
        <p>
          Esos datos existen para que puedas atender el pedido y para que quede
          constancia de qué se reservó y a qué precio. No los vendemos, no los usamos
          para publicidad y no los compartimos con terceros.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Estadísticas de visitas</h2>
        <p>
          Contamos cuántas personas abren tu catálogo, cuántas agregan productos y
          cuántas siguen la conversación por WhatsApp. Ese conteo no guarda nombres,
          teléfonos, direcciones IP ni el contenido de los pedidos: solo el número de
          veces que ocurrió cada acción.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Dónde viven los datos</h2>
        <p>
          La información se almacena en Supabase y el sitio se sirve desde Cloudflare,
          ambos proveedores de infraestructura con servidores fuera de Bolivia. No
          usamos servicios de publicidad ni de seguimiento de terceros, y las fuentes
          tipográficas se sirven desde nuestro propio dominio.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Cuánto tiempo se conservan</h2>
        <p>
          Mientras tu cuenta esté activa, conservamos tu catálogo y tus pedidos. Si dejás
          de pagar, tu catálogo deja de publicarse pero no se borra nada: seguís entrando
          a tu panel y tus datos te esperan.
        </p>
        <p>
          Si pedís que borremos tu cuenta, eliminamos tu negocio, tus productos, tus
          imágenes y los pedidos asociados dentro de los treinta días siguientes.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Tus derechos</h2>
        <p>
          Podés pedirnos en cualquier momento una copia de tus datos, la corrección de un
          dato equivocado o el borrado completo de tu cuenta. Escribinos y lo resolvemos.
        </p>
        <a
          className={styles.contacto}
          href={construirEnlaceContacto("Hola, tengo una consulta sobre mis datos en MiPuesto.")}
          rel="noreferrer"
          target="_blank"
        >
          Escribir sobre mis datos
        </a>
      </section>

      <section className={styles.seccion}>
        <h2>Cambios en esta página</h2>
        <p>
          Si cambiamos algo importante, actualizamos la fecha de arriba y te avisamos por
          WhatsApp antes de que entre en vigor.
        </p>
      </section>
    </main>
  );
}
