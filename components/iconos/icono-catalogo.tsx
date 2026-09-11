import { TRAZOS_CATALOGO, type NombreIconoCatalogo } from "./catalogo";
import { ICONO_PREDETERMINADO, normalizarIcono } from "../../lib/catalogo/categorias";

/* El ícono de una categoría, elegido por el dueño del negocio.
 *
 * Se separa de `Icono` por una diferencia que importa para la seguridad: allá el
 * nombre lo escribe quien programa la pantalla y el sistema de tipos garantiza
 * que exista. **Acá el nombre viene de la base**, guardado alguna vez por el
 * dueño, y termina en un `dangerouslySetInnerHTML`.
 *
 * Por eso el nombre no se usa nunca tal cual: se normaliza contra el juego
 * generado, y lo que no está cae al ícono predeterminado. El trazo que se dibuja
 * sale **siempre** del archivo versionado, jamás de lo que llegó. Aunque alguien
 * escribiera HTML en esa columna saltándose la aplicación, nunca se dibujaría:
 * no sería una llave del juego y saldría una caja.
 *
 * El resto —lienzo de `1em`, trazo en `currentColor`, decorativo por omisión—
 * sigue las mismas reglas que `Icono`, y por las mismas razones: el ícono toma el
 * color y el cuerpo de lo que tiene al lado, así que no puede traer un color
 * fuera de la paleta.
 */
/* El título también se escapa, y no por exceso de celo: acá el título es **el
   nombre de la categoría**, que lo escribe el dueño del negocio. En `Icono` el
   título lo escribe quien programa la pantalla y por eso va tal cual; si acá
   fuera igual, un negocio podría llamar a su categoría `</title><script>` y el
   trazo dejaría de ser lo único que sale del archivo generado. */
function escapar(texto: string) {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function IconoCatalogo({
  className,
  nombre,
  titulo,
}: {
  className?: string;
  /* `unknown` y no `NombreIconoCatalogo` a propósito: quien llama tiene una fila
     de la base, no un nombre comprobado. Pedirle el tipo estricto lo empujaría a
     hacer un `as` en cada pantalla, que es justo la aserción que se quiere
     evitar. */
  nombre: unknown;
  titulo?: string;
}) {
  const seguro: NombreIconoCatalogo = normalizarIcono(nombre);
  const trazo = TRAZOS_CATALOGO[seguro] ?? TRAZOS_CATALOGO[ICONO_PREDETERMINADO];

  return (
    <svg
      aria-hidden={titulo ? undefined : true}
      className={className}
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={titulo ? "img" : undefined}
      dangerouslySetInnerHTML={{
        __html: titulo ? `<title>${escapar(titulo)}</title>${trazo}` : trazo,
      }}
    />
  );
}
