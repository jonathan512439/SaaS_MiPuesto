/* Las pestañas de la plataforma.
 *
 * Era una sola pantalla con cinco bloques apilados: invitar, el consumo de IA,
 * el de almacenamiento, las etiquetas NFC y el listado de negocios. Cada uno
 * está bien por separado, pero juntos obligan a desplazar media pantalla para
 * llegar a lo único que se mira todos los días —quién está por vencer— y dejan
 * el consumo de la API, que se mira una vez por semana, ocupando el mismo lugar
 * de privilegio.
 *
 * Se parten en tres, y el corte no es por tamaño sino **por pregunta**:
 *
 * - «¿Cómo están mis clientes?» → Negocios.
 * - «¿Cuánto estoy gastando?» → Consumo.
 * - «¿Qué hago?» → Herramientas.
 *
 * La pestaña viaja en la dirección y no en el estado del navegador: así el
 * administrador puede guardar «Consumo» en favoritos, y volver de una acción no
 * lo devuelve a la primera. Es lo mismo que hace el catálogo público con sus
 * filtros.
 */
export const PESTANAS_PLATAFORMA = [
  {
    id: "negocios",
    titulo: "Negocios",
    /* La descripción del encabezado cambia con la pestaña: decir «x negocios, y
       necesitan atención» arriba del consumo de la API sería hablar de otra
       cosa. */
    pregunta: "Cómo están tus clientes",
  },
  { id: "consumo", titulo: "Consumo", pregunta: "Cuánto se está gastando" },
  { id: "herramientas", titulo: "Herramientas", pregunta: "Invitar y etiquetar" },
] as const;

export type PestanaPlataforma = (typeof PESTANAS_PLATAFORMA)[number]["id"];

/* Lo que venga en la dirección puede ser cualquier cosa —alguien escribiendo a
   mano, un enlace viejo— y eso no puede dejar la pantalla en blanco: cae en la
   primera, que es la que casi siempre se quiere. */
export function leerPestana(valor: unknown): PestanaPlataforma {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  const encontrada = PESTANAS_PLATAFORMA.find(({ id }) => id === texto);
  return encontrada?.id ?? "negocios";
}
