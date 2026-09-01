import styles from "./ui.module.css";

type VarianteEsqueleto = "texto" | "titulo" | "imagen" | "circulo";

export function Esqueleto({ variante = "texto" }: { variante?: VarianteEsqueleto }) {
  const claseVariante: Record<VarianteEsqueleto, string> = {
    texto: styles.esqueletoTexto,
    titulo: styles.esqueletoTitulo,
    imagen: styles.esqueletoImagen,
    circulo: styles.esqueletoCirculo,
  };

  return (
    <span
      aria-hidden="true"
      className={[styles.esqueleto, claseVariante[variante]].join(" ")}
    />
  );
}
