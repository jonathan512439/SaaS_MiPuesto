/* Las direcciones del panel, en un solo lugar.
 *
 * Estaban escritas a mano en veinticuatro sitios, y la mayoría no eran enlaces
 * de una pantalla a otra: eran el `redirect` de «todavía no tenés negocio» que
 * repite cada página del panel. Veinticuatro copias de una dirección aguantan
 * bien hasta el día que una pantalla cambia de nombre; ese día, la que queda sin
 * actualizar manda al dueño a un 404 desde el lugar donde menos se lo espera
 * —recién entrado, sin negocio, sin saber qué hizo mal—.
 *
 * Esto no es una capa de abstracción sobre el enrutador: son las mismas cadenas,
 * nombradas. Next sigue resolviendo las carpetas como siempre. Lo único que
 * cambia es que ahora hay **un** sitio donde corregirlas, y una prueba que
 * comprueba que nadie vuelva a escribirlas sueltas.
 */

export const RUTAS_PANEL = {
  inicio: "/dashboard",
  /* «Mi negocio» y no «configuración»: lo que hay adentro son el nombre, el
     logo, el WhatsApp y el horario, que para el dueño no son configuración sino
     su negocio. La carpeta se llamaba `configuracion` desde antes de que
     existiera esa distinción. */
  negocio: "/dashboard/negocio",
  catalogo: "/dashboard/catalogo",
  apariencia: "/dashboard/apariencia",
  promociones: "/dashboard/promociones",
  pedidos: "/dashboard/pedidos",
  agenda: "/dashboard/agenda",
  cuenta: "/dashboard/cuenta",
  /* Las tres herramientas que hoy cuelgan de «Mi catálogo». Se nombran acá desde
     ahora, aunque todavía no se hayan mudado a su pantalla propia: así el día
     que se muden cambia un valor y no hay que rastrear quién las enlazaba. */
  importar: "/dashboard/catalogo/importar",
  desdeFoto: "/dashboard/catalogo/desde-foto",
  papelera: "/dashboard/catalogo/papelera",
} as const;

/* A dónde va quien entra al panel sin tener un negocio todavía.
 *
 * Tiene nombre propio, y no es `RUTAS_PANEL.negocio` escrito en cada página,
 * porque **es una decisión y no una dirección**: hoy se lo manda a la pantalla
 * de su negocio para que lo cree ahí, y el día que se lo mande al alta guiada
 * hay que cambiarlo en un lugar y no en catorce. */
export const RUTA_SIN_NEGOCIO = RUTAS_PANEL.negocio;

/* Las direcciones viejas y su destino de hoy.
 *
 * Renombrar una pantalla del panel rompe lo que el dueño guardó en favoritos y
 * lo que quedó escrito en un chat de soporte. Redirigir cuesta un archivo de
 * tres líneas por pantalla y evita que alguien crea que el panel se rompió. */
export const RUTAS_MUDADAS: ReadonlyArray<{ vieja: string; nueva: string }> = [
  { vieja: "/dashboard/configuracion", nueva: RUTAS_PANEL.negocio },
  { vieja: "/dashboard/plantilla", nueva: RUTAS_PANEL.apariencia },
];
