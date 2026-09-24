"use client";

import Link from "next/link";

import styles from "./not-found.module.css";

/* Sin esta pantalla, un tropiezo de la base le mostraba al comprador el error
   crudo de Next: fondo blanco, letra chica y un identificador que no le sirve a
   nadie. Es la primera impresión de alguien que llegó por un QR pegado en una
   mesa, así que vale la pena que diga algo humano y ofrezca reintentar.

   Reusa la hoja de la página de «no encontrado» a propósito: son la misma
   situación para quien mira —algo no salió— y dos diseños distintos para eso
   sería trabajo de más que además se desincroniza. */
export default function ErrorInesperado({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.pagina}>
      <section className={styles.mensaje}>
        <Link className={styles.marca} href="/">
          MiPuesto
        </Link>
        <h1>Algo se cortó de nuestro lado</h1>
        <p>
          No pudimos cargar esta página. Casi siempre se arregla volviendo a
          intentar; si sigue igual, prueba en un rato.
        </p>
        <div className={styles.acciones}>
          <button onClick={() => reset()} type="button">
            Volver a intentar
          </button>
          <Link href="/">Ir al inicio</Link>
        </div>
        {/* El identificador solo sirve para que alguien nos lo diga si escribe.
            Va al final y en chico: no es información para el visitante. */}
        {error.digest ? <small>Referencia: {error.digest}</small> : null}
      </section>
    </main>
  );
}
