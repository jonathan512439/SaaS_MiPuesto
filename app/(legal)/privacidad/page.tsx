import type { Metadata } from "next";

import { WHATSAPP_MIPUESTO, construirEnlaceContacto } from "../../../lib/contacto";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacidad | MiPuesto",
  description: "Qué datos guarda MiPuesto, para qué los usa y cómo pedir que se borren.",
};

const VIGENCIA = "7 de septiembre de 2026";

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
        <h2>Las herramientas que leen fotos</h2>
        <p>
          Algunos negocios tienen habilitadas dos herramientas que leen una fotografía y
          proponen texto: una completa el nombre y la descripción de un producto a partir
          de su foto, y la otra arma un borrador de catálogo a partir de la foto de una
          lista de precios. <strong>Solo funcionan si te las habilitamos</strong>; si no
          las ves en tu panel, nada de lo que sigue te afecta.
        </p>
        <p>
          Nunca se envía nada solo. Vos elegís cada fotografía, una por una, y hasta que
          no la elegís no sale de tu dispositivo.
        </p>
        <p>Cuando la elegís, esa fotografía se envía a Google, que es quien la lee.</p>
        <p><strong>Lo que se envía es únicamente esa fotografía.</strong> No se envía:</p>
        <ul>
          <li>El nombre, el teléfono ni los pedidos de quienes te compran.</li>
          <li>El resto de tu catálogo, tus precios ni tus promociones.</li>
          <li>Tu correo, tu contraseña ni tu teléfono.</li>
        </ul>
        <p>
          Google devuelve un texto propuesto y ahí termina su participación: la foto no se
          publica en ningún lado por su cuenta, y el texto no se guarda en tu catálogo
          hasta que vos lo revisás y lo aceptás.
        </p>
        <p>
          <strong>Algo que queremos que sepas y no está escondido acá abajo:</strong> las
          condiciones con las que ese proveedor trata lo que se le envía son suyas y
          pueden cambiar. Si cambian de una forma que te afecte, actualizamos esta página
          y te avisamos. Y si preferís que tus listas de precios no salgan de acá, pedinos
          que te apaguemos las herramientas y seguís cargando a mano, sin ningún cargo ni
          penalidad.
        </p>
        <p>
          De cada lectura guardamos un registro para controlar el consumo: la fecha, cuál
          de las dos herramientas fue y el tamaño del pedido.{" "}
          <strong>No guardamos la fotografía en ese registro</strong>, y lo borramos a los
          treinta días. La foto sí queda guardada como imagen de tu producto, igual que
          cualquier otra que subas, si decidís usarla.
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
          La información se almacena en <strong>Supabase</strong> y el sitio se sirve
          desde <strong>Cloudflare</strong>, ambos proveedores de infraestructura con
          servidores fuera de Bolivia. Si tenés habilitadas las herramientas que leen
          fotos, las fotografías que elijas para eso pasan además por{" "}
          <strong>Google</strong>, también fuera de Bolivia, como se explica más arriba.
        </p>
        <p>
          Esos tres son todos. No usamos servicios de publicidad ni de seguimiento de
          terceros, y las fuentes tipográficas se sirven desde nuestro propio dominio.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Cuánto tiempo se conservan</h2>
        <p>
          Mientras tu cuenta esté activa, conservamos tu catálogo y tus pedidos.
        </p>
        <p>
          Si dejás de pagar, tu catálogo deja de publicarse y tus datos te esperan en el
          panel durante <strong>noventa días</strong>. Pasado ese plazo podemos borrarlos,
          y te avisamos antes por WhatsApp.
        </p>
        <p>
          Si pedís que borremos tu cuenta, eliminamos tu negocio, tus productos, tus
          imágenes y los pedidos asociados dentro de los treinta días siguientes.
        </p>
        <p>
          El nombre y el teléfono de quien te hace un pedido se guardan por su propio
          plazo, más corto: pasados seis meses de un pedido cerrado los quitamos, aunque
          tu cuenta siga activa. Son datos de tu cliente y no hay motivo para conservarlos
          más tiempo.
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
