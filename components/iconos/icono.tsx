import { TRAZOS, type NombreIcono } from "./trazos";

/* Un ícono, dibujado con el color y el tamaño de quien lo contiene.
 *
 * No recibe color ni tamaño por propiedad, y es a propósito: el trazo va en
 * `currentColor` y el lienzo en `1em`, así que un ícono siempre sale del color
 * y del cuerpo del texto que tiene al lado. Es lo que hace que no haga falta
 * acordarse de ajustarlo en cada pantalla, y lo que impide que alguien meta un
 * color fuera de la paleta.
 *
 * Es decorativo por omisión: `aria-hidden`, porque al lado suyo casi siempre hay
 * una palabra que dice lo mismo y repetirlo obliga a escuchar dos veces. Cuando
 * el ícono es lo único que hay —un botón sin texto—, se le pasa `titulo` y pasa
 * a anunciarse.
 */
export function Icono({
  className,
  nombre,
  titulo,
}: {
  className?: string;
  nombre: NombreIcono;
  titulo?: string;
}) {
  return (
    <svg
      aria-hidden={titulo ? undefined : true}
      className={className}
      /* `1em` y no un número de píxeles: el ícono crece y se achica con el texto
         que lo acompaña, en cualquier pantalla y con cualquier cuerpo. */
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={titulo ? "img" : undefined}
      /* El contenido viene de un archivo generado a partir de Lucide y se
         versiona en el repositorio: no hay ninguna vía por la que pueda entrar
         algo escrito por un usuario. */
      dangerouslySetInnerHTML={{
        __html: titulo ? `<title>${titulo}</title>${TRAZOS[nombre]}` : TRAZOS[nombre],
      }}
    />
  );
}

export type { NombreIcono };
