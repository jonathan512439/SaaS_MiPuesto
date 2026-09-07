import type { Metadata } from "next";

import { PRECIO_MENSUAL_BS, construirEnlaceContacto } from "../../../lib/contacto";
/* Los topes se importan y no se escriben acá: son los mismos números que aplica
   el sistema, así que la página no puede prometer una cifra distinta de la que
   se cumple. Si mañana cambian, cambian en los dos lados a la vez. */
import { TOPE_FOTOS_POR_DIA, TOPE_FOTOS_POR_MES } from "../../../lib/ia/limites";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Términos del servicio | MiPuesto",
  description: "Condiciones de uso de MiPuesto: qué incluye, cuánto cuesta y qué pasa si dejás de pagar.",
};

const VIGENCIA = "7 de septiembre de 2026";

export default function PaginaTerminos() {
  return (
    <main className={styles.pagina}>
      <header className={styles.encabezado}>
        <h1>Términos del servicio</h1>
        <p className={styles.vigencia}>Vigente desde el {VIGENCIA}.</p>
      </header>

      <section className={styles.seccion}>
        <h2>Qué es MiPuesto</h2>
        <p>
          MiPuesto te da un catálogo digital para tu negocio, con una dirección web
          propia, un código QR para compartirla y un panel para administrar productos,
          precios, promociones y pedidos. Los pedidos se cierran por WhatsApp, entre vos
          y tu cliente.
        </p>
        <p>
          MiPuesto no participa en la venta. No cobramos a tu cliente, no procesamos
          pagos y no somos parte del acuerdo entre ustedes.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Cuánto cuesta</h2>
        <p>
          Bs {PRECIO_MENSUAL_BS} al mes. El primer mes es gratis. No cobramos comisión
          por venta ni cargo de instalación.
        </p>
        <p>
          El cobro es mensual y se coordina con vos por WhatsApp. No hay contrato de
          permanencia: podés dejar de pagar cuando quieras y no se te cobra nada
          adicional.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Si dejás de pagar</h2>
        <p>
          Al día siguiente del vencimiento tu catálogo deja de publicarse y sale del
          directorio. Seguís entrando a tu panel y ves tus productos, tus pedidos y tu
          historial. Cuando reanudás el pago, tu catálogo vuelve tal cual estaba, el
          mismo día.
        </p>
        <p>
          Guardamos todo por <strong>noventa días</strong> desde que tu catálogo sale de
          línea. Pasado ese plazo podemos borrarlo. Antes de borrar nada te escribimos al
          WhatsApp que registraste, y si querés una copia de tus datos nos la pedís y te
          la damos.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Las herramientas que leen fotos</h2>
        <p>
          Son dos: una completa el nombre y la descripción de un producto mirando su
          fotografía, y la otra arma un borrador de catálogo a partir de la foto de una
          lista de precios. <strong>No vienen incluidas</strong>: se habilitan negocio por
          negocio y te avisamos cuando las tenés.
        </p>
        <p>
          <strong>Son una ayuda para escribir, no una fuente de verdad.</strong> Lo que
          proponen aparece siempre en una pantalla de revisión antes de guardarse, y nada
          se publica hasta que vos lo aceptás. El precio no sale nunca de una fotografía:
          ese lo ponés vos, siempre.
        </p>
        <p>
          No garantizamos que lo que lea sea correcto. Puede confundir un producto,
          escribir mal un nombre o inventar un detalle. Revisar antes de publicar es tu
          responsabilidad, igual que con cualquier texto que cargues a mano.
        </p>
        <p>
          Tienen un tope de uso, para que el servicio alcance para todos los negocios que
          las tienen habilitadas: <strong>{TOPE_FOTOS_POR_DIA} fotografías por día</strong>{" "}
          y <strong>{TOPE_FOTOS_POR_MES} por mes</strong>. Al llegar al tope, la
          herramienta te dice cuándo podés seguir. El resto de tu panel no se ve afectado.
        </p>
        <p>
          La lectura la hace un proveedor externo, Google, y eso trae dos consecuencias
          que preferimos decir antes y no después. La primera: ese proveedor puede cambiar
          sus condiciones o dejar de estar disponible, y en ese caso las herramientas
          podrían quedar limitadas o desaparecer. La segunda: la fotografía que elijas
          sale de nuestros servidores. Qué se envía exactamente, qué no se envía nunca y
          qué hace ese proveedor con ella está detallado en la página de privacidad, y te
          pedimos que lo leas antes de usarlas.
        </p>
        <p>
          <strong>Estas herramientas no son el servicio.</strong> MiPuesto es tu catálogo,
          tu dirección web y tu panel, y todo eso funciona igual sin ellas. Si algún día
          no podemos seguir ofreciéndolas, te avisamos, no te cobramos por ellas y tu
          catálogo sigue exactamente como está.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Tus responsabilidades</h2>
        <ul>
          <li>
            Los productos, precios, fotos y descripciones que publicás son tuyos y son tu
            responsabilidad. Deben ser reales y estar al día.
          </li>
          <li>
            No podés publicar productos cuya venta esté prohibida por la ley boliviana,
            ni contenido de terceros sobre el que no tengas derechos.
          </li>
          <li>
            Sos responsable de cumplir con lo que ofrecés a tus clientes y de atender sus
            pedidos.
          </li>
          <li>
            Cuidá tu contraseña. Las acciones hechas desde tu cuenta se consideran
            tuyas.
          </li>
          <li>
            Si usás las herramientas que leen fotos, revisá lo que proponen antes de
            publicarlo. El contenido publicado sigue siendo tuyo y tu responsabilidad,
            lo hayas escrito vos o lo hayas aceptado de una propuesta.
          </li>
        </ul>
      </section>

      <section className={styles.seccion}>
        <h2>Nuestras responsabilidades</h2>
        <p>
          Nos comprometemos a mantener el servicio funcionando y tus datos disponibles.
          No podemos garantizar que el sitio esté disponible sin interrupciones, porque
          depende de proveedores de infraestructura que no controlamos.
        </p>
        <p>
          Si el servicio falla, nuestra responsabilidad se limita a lo que hayas pagado
          por el mes en curso. No respondemos por ventas no concretadas ni por acuerdos
          entre vos y tus clientes.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Cuándo podemos cerrar una cuenta</h2>
        <p>
          Podemos suspender una cuenta que publique contenido ilegal, que suplante a otro
          negocio o que use el servicio para engañar a las personas. Te avisamos antes,
          salvo que la urgencia lo impida, y te damos tus datos si los pedís.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Tus datos</h2>
        <p>
          Cómo tratamos la información tuya y la de quienes te compran está detallado en
          la página de privacidad.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Consultas</h2>
        <p>
          Cualquier duda sobre estas condiciones la resolvemos conversando. Escribinos.
        </p>
        <a
          className={styles.contacto}
          href={construirEnlaceContacto("Hola, tengo una consulta sobre los términos de MiPuesto.")}
          rel="noreferrer"
          target="_blank"
        >
          Escribir por WhatsApp
        </a>
      </section>
    </main>
  );
}
