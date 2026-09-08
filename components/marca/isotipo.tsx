import styles from "./isotipo.module.css";

/* El isotipo de MiPuesto: un toldo sobre un mostrador, o sea un puesto.
 *
 * Va como SVG en línea y no como imagen por tres motivos concretos:
 *
 * 1. **Color.** Toma `currentColor`, así que el mismo archivo sirve en la barra
 *    clara y en la franja oscura. Antes había que forzarlo a blanco con
 *    `filter: brightness(0) invert(1)`, que es un parche que además impide
 *    pintarlo del color de la marca.
 * 2. **Nitidez.** El PNG medía 256 px de ancho: al mostrarlo grande en el cierre
 *    de la portada se veía blando en cualquier pantalla moderna.
 * 3. **Peso.** Los dos PNG sumaban 42 KB y dos pedidos de red. Esto son unos
 *    600 bytes que viajan dentro del HTML, sin pedido aparte.
 *
 * La geometría no está dibujada a ojo: se midió el PNG original píxel por píxel
 * —los bordes de cada trazo, los picos de las ondas, el radio de las esquinas—
 * y de ahí salen todas las coordenadas. El `viewBox` es el tamaño exacto del
 * archivo original para que las proporciones sean las mismas.
 */
export function Isotipo({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <svg
      aria-hidden={titulo ? undefined : true}
      className={className ? `${styles.isotipo} ${className}` : styles.isotipo}
      fill="none"
      /* Tamaño de reserva, no el definitivo: cada pantalla le da su altura por
         CSS y cualquier regla le gana a un atributo. Está para que un descuido
         salga como un ícono chico y no como un logotipo de media pantalla. */
      height="30"
      role={titulo ? "img" : undefined}
      stroke="currentColor"
      strokeLinejoin="round"
      viewBox="0 0 256 325"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {titulo ? <title>{titulo}</title> : null}
      {/* El toldo. Las tres ondas son curvas cuadráticas y no arcos: el punto de
          control a 149 deja el fondo de cada onda en 122, que es donde estaba en
          el original. */}
      <path
        d="M21 95 C21 56 44 23 66 23 L190 23 C212 23 234 56 234 95 Q198.5 149 164 95 Q128 149 92 95 Q56.5 149 21 95 Z"
        strokeWidth="18"
      />
      {/* El mostrador. Abierto arriba, con las esquinas de abajo redondeadas. */}
      <path
        d="M53 144 V290 a12 12 0 0 0 12 12 h124 a12 12 0 0 0 12 -12 V144"
        strokeWidth="16"
      />
    </svg>
  );
}
