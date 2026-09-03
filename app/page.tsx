import Link from "next/link";
import styles from "./inicio.module.css";

export const dynamic = "force-dynamic";

export default function Inicio() {
  return (
    <main className={styles.pagina}>
      <h1>MiPuesto</h1>
      <p>Catálogos digitales para descubrir y comprar en negocios locales de Bolivia.</p>
      <nav aria-label="Accesos principales">
        <Link href="/directorio">Explorar negocios</Link>
        <Link href="/login">Ingresar al panel</Link>
      </nav>
    </main>
  );
}
