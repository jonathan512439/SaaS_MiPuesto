import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./marco-auth.module.css";

type PropiedadesMarcoAuth = {
  children: ReactNode;
  titulo: string;
  descripcion: string;
  paso: string;
};

export function MarcoAuth({
  children,
  titulo,
  descripcion,
  paso,
}: PropiedadesMarcoAuth) {
  return (
    <div className={styles.pagina}>
      <aside className={styles.identidad} aria-label="Acceso privado MiPuesto">
        <Link className={styles.marca} href="/">
          MiPuesto
        </Link>
        <div className={styles.mensajeMarca}>
          <p className={styles.paso}>{paso}</p>
          <p className={styles.frase}>
            Tu catálogo se administra desde un espacio privado y separado del de
            otros negocios.
          </p>
        </div>
        <p className={styles.ayudaMarca}>
          Las cuentas se habilitan por invitación. Si todavía no recibiste una,
          comunicate con MiPuesto.
        </p>
      </aside>

      <main className={styles.trabajo} aria-labelledby="titulo-auth">
        <div className={styles.tarjeta}>
          <header className={styles.cabecera}>
            <h1 id="titulo-auth">{titulo}</h1>
            <p>{descripcion}</p>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
