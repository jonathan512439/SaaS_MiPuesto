import { ImageResponse } from "next/og";

import { PRECIO_MENSUAL_BS } from "../lib/contacto";
import { COLORES_MIPUESTO } from "../lib/identidad-visual";

/* La tarjeta que se ve cuando alguien pega el enlace de MiPuesto en WhatsApp.
 *
 * Los catálogos ya tenían la suya desde hace meses; la portada, no. Y MiPuesto
 * se vende **entero por WhatsApp**: cada vez que se manda el enlace a un cliente
 * posible, esa tarjeta es la primera impresión, y salía vacía.
 *
 * No lleva foto de fondo a propósito. La de un catálogo muestra la portada del
 * negocio porque ahí lo que importa es el negocio; acá lo que importa es la
 * marca, y una foto genérica de archivo diría menos que el logotipo.
 */
export const alt = "MiPuesto, catálogos digitales para negocios de Bolivia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ImagenPortada() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: COLORES_MIPUESTO.marca,
          color: COLORES_MIPUESTO.superficie,
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* El toldo, grande y cortado por el borde: se reconoce la forma sin
            competir con el texto, y es lo único de la tarjeta que no se puede
            copiar.

            El color va escrito y no sale de una opacidad porque el generador de
            esta imagen **ignora `stroke-opacity`**: se comprobó mirando el PNG,
            donde salía blanco puro. Y no es tan tenue como sería en una pantalla:
            en WhatsApp esta tarjeta se ve del tamaño de una miniatura, y ahí una
            marca de agua sutil desaparece. */}
        <svg
          fill="none"
          height="620"
          stroke="#84a5a9"
          strokeLinejoin="round"
          strokeWidth="18"
          style={{ position: "absolute", top: "-40px", right: "-90px" }}
          viewBox="0 0 256 325"
          width="488"
        >
          <path d="M21 95 C21 56 44 23 66 23 L190 23 C212 23 234 56 234 95 Q198.5 149 164 95 Q128 149 92 95 Q56.5 149 21 95 Z" />
          <path d="M53 144 V290 a12 12 0 0 0 12 12 h124 a12 12 0 0 0 12 -12 V144" strokeWidth="16" />
        </svg>

        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <svg
            fill="none"
            height="112"
            stroke={COLORES_MIPUESTO.superficie}
            strokeLinejoin="round"
            strokeWidth="18"
            viewBox="0 0 256 325"
            width="88"
          >
            <path d="M21 95 C21 56 44 23 66 23 L190 23 C212 23 234 56 234 95 Q198.5 149 164 95 Q128 149 92 95 Q56.5 149 21 95 Z" />
            <path
              d="M53 144 V290 a12 12 0 0 0 12 12 h124 a12 12 0 0 0 12 -12 V144"
              strokeWidth="16"
            />
          </svg>
          <span style={{ fontSize: "56px", fontWeight: 900, letterSpacing: "-2px" }}>
            MiPuesto
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "760px" }}>
          <span style={{ fontSize: "68px", fontWeight: 900, lineHeight: 1.05 }}>
            Tu catálogo digital, con pedidos por WhatsApp
          </span>
          <span style={{ fontSize: "34px", opacity: 0.86, lineHeight: 1.3 }}>
            Tu dirección web propia, tu código QR y hasta 300 productos.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <span
            style={{
              display: "flex",
              borderRadius: "999px",
              padding: "14px 32px",
              background: COLORES_MIPUESTO.superficie,
              color: COLORES_MIPUESTO.marca,
              fontSize: "32px",
              fontWeight: 900,
            }}
          >
            Bs {PRECIO_MENSUAL_BS} al mes
          </span>
          <span style={{ fontSize: "30px", opacity: 0.86 }}>El primer mes es gratis</span>
        </div>
      </div>
    ),
    size,
  );
}
