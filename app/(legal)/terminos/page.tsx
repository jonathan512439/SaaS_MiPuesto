import type { Metadata } from "next";

import { PRECIO_MENSUAL_BS, construirEnlaceContacto } from "../../../lib/contacto";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Términos del servicio | MiPuesto",
  description: "Condiciones de uso de MiPuesto: qué incluye, cuánto cuesta y qué pasa si dejás de pagar.",
};

const VIGENCIA = "4 de septiembre de 2026";

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
          Tu catálogo deja de publicarse y sale del directorio, pero tus datos no se
          borran. Seguís entrando a tu panel y ves tus productos, tus pedidos y tu
          historial. Cuando reanudás el pago, tu catálogo vuelve tal cual estaba.
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
