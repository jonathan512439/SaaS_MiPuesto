"use client";

import { useEffect, useState } from "react";

import { COLORES_MIPUESTO } from "../../lib/identidad-visual";
import { dibujarQrConLogo } from "../../lib/qr-con-logo";
import styles from "./codigo-qr-negocio.module.css";

type PropiedadesCodigoQr = {
  nombreNegocio: string;
  urlCatalogo: string;
};

export function CodigoQrNegocio({ nombreNegocio, urlCatalogo }: PropiedadesCodigoQr) {
  const [imagen, setImagen] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    dibujarQrConLogo({
      texto: urlCatalogo,
      lado: 320,
      colorOscuro: COLORES_MIPUESTO.texto,
      colorClaro: COLORES_MIPUESTO.superficie,
    })
      .then((resultado) => {
        if (activo) setImagen(resultado);
      })
      .catch(() => {
        if (activo) setError("No se pudo preparar el QR. Recargá la página para intentarlo otra vez.");
      });
    return () => {
      activo = false;
    };
  }, [urlCatalogo]);

  return (
    <section aria-labelledby="titulo-qr-catalogo" className={styles.bloque}>
      <div className={styles.texto}>
        <h2 id="titulo-qr-catalogo">Código QR de tu catálogo</h2>
        <p>Imprímelo o compártelo: al escanearlo se abre tu catálogo.</p>
        <a href={urlCatalogo} rel="noreferrer" target="_blank">Abrir catálogo público</a>
      </div>
      <div className={styles.vista} aria-live="polite">
        {imagen ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={`Código QR para abrir el catálogo de ${nombreNegocio}`} src={imagen} />
            <a download={`qr-${nombreNegocio.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`} href={imagen}>
              Descargar QR
            </a>
          </>
        ) : error ? (
          <p className={styles.error}>{error}</p>
        ) : (
          <p>Preparando el QR…</p>
        )}
      </div>
    </section>
  );
}
