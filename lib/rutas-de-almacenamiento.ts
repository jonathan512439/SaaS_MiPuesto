/* Qué puede ser la ruta de una imagen guardada: carpetas y archivo dentro de un
 * depósito de Storage, y nada más.
 *
 * Las rutas las genera el sistema —`<negocio>/logo/<uuid>.webp`,
 * `<negocio>/<producto>/<uuid>.webp`—, pero la columna donde se guardan la
 * puede escribir el dueño con su sesión, sin pasar por la ruta que sube la
 * imagen. Hasta el 2026-11-15 una dirección `https://` guardada ahí se usaba
 * tal cual: el catálogo la ponía en la página y la imagen para compartir
 * **la pedía desde el servidor**, a donde el dueño dijera.
 *
 * Con esto, lo que no sea una ruta del depósito no se convierte en dirección:
 * la imagen simplemente no aparece. Se rechaza todo lo que podría sacar la
 * dirección de su carpeta —un esquema (`https:`), una barra invertida, `..`,
 * una consulta o un fragmento—, no una lista de formatos: los nombres de
 * archivo pueden cambiar; salir del depósito, no.
 */
const LARGO_MAXIMO = 300;

export function esRutaDeAlmacenamiento(ruta: unknown): ruta is string {
  if (typeof ruta !== "string" || ruta === "" || ruta.length > LARGO_MAXIMO) return false;
  /* Los dos puntos cortan cualquier esquema; lo demás, las formas de torcer
     una dirección después de armada. */
  if (/[:\\?#]/.test(ruta)) return false;
  return ruta.split("/").every((tramo) => tramo !== "" && tramo !== "." && tramo !== "..");
}
