/* Las marcas de las redes, dibujadas a mano.
 *
 * No salen de `trazos.ts` porque **Lucide sacó los íconos de marca** de su
 * colección: quedan `globe` y poco más. Y no se trae otra biblioteca por tres
 * dibujos: serían cientos de kilobytes y una dependencia más que vigilar, para
 * algo que son tres siluetas de veinticuatro por veinticuatro.
 *
 * Son siluetas reconocibles y no los logotipos oficiales, a propósito: se dibujan
 * con el mismo trazo que el resto de los íconos del catálogo, así que toman el
 * color del negocio y no meten un azul de Facebook en una paleta de tierra. Lo
 * que tiene que pasar acá es que el cliente reconozca a dónde va, no que la
 * marca salga en su color corporativo.
 *
 * El sitio web va con un mundo: es lo que se entiende sin leer, y además es lo
 * único que no es una red.
 */
import { Icono } from "./icono";

export type RedConocida = "Facebook" | "Instagram" | "TikTok" | "Sitio web";

const SILUETAS: Record<Exclude<RedConocida, "Sitio web">, string> = {
  Facebook: `<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />`,
  Instagram: `<rect width="20" height="20" x="2" y="2" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37" /><path d="M17.5 6.5h.01" />`,
  /* La nota de TikTok, simplificada: el círculo y el gancho hacia arriba. */
  TikTok: `<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />`,
};

function esConocida(nombre: string): nombre is Exclude<RedConocida, "Sitio web"> {
  return nombre in SILUETAS;
}

export function IconoRed({ className, nombre }: { className?: string; nombre: string }) {
  /* El mundo lo tiene el juego general, así que el sitio web usa ese y no una
     copia. Y cualquier nombre que no reconozcamos cae en el eslabón de enlace:
     es un enlace, y eso es cierto siempre. */
  if (!esConocida(nombre)) {
    return <Icono className={className} nombre={nombre === "Sitio web" ? "mundo" : "enlace"} />;
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      /* Las siluetas están escritas acá arriba y se versionan: no hay ninguna
         vía por la que pueda entrar algo escrito por alguien de afuera. */
      dangerouslySetInnerHTML={{ __html: SILUETAS[nombre] }}
    />
  );
}
