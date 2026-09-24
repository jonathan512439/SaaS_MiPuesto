/* Las direcciones del panel, en un solo lugar.
 *
 * Estaban escritas a mano en veinticuatro sitios, y la mayoría no eran enlaces
 * de una pantalla a otra: eran el `redirect` de «todavía no tienes negocio» que
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
  /* Dos pantallas y no una: «Mi catálogo» son las categorías —se arman una vez—
     y «Productos» es la lista, que se toca todos los días. Estaban juntas, con
     las categorías plegadas arriba de los productos, y el trabajo de una vez le
     comía sitio al de todos los días. */
  catalogo: "/dashboard/catalogo",
  productos: "/dashboard/productos",
  apariencia: "/dashboard/apariencia",
  promociones: "/dashboard/promociones",
  /* Pedidos **y citas**: eran dos pantallas, y un dueño que vende cosas y turnos
     tenía que acordarse de mirar las dos. Lo que se olvida de mirar es lo que se
     atiende tarde. */
  pedidos: "/dashboard/pedidos",
  cuenta: "/dashboard/cuenta",
  /* Las herramientas: lo que se usa de vez en cuando y no todos los días.
     Colgaban de «Mi catálogo», apretadas en una fila de botones chicos arriba de
     la pantalla que más se usa, donde no había lugar para explicar qué hace cada
     una. */
  herramientas: "/dashboard/herramientas",
  importar: "/dashboard/herramientas/importar",
  desdeFoto: "/dashboard/herramientas/desde-foto",
  papelera: "/dashboard/herramientas/papelera",
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
  { vieja: "/dashboard/catalogo/importar", nueva: RUTAS_PANEL.importar },
  { vieja: "/dashboard/catalogo/desde-foto", nueva: RUTAS_PANEL.desdeFoto },
  { vieja: "/dashboard/catalogo/papelera", nueva: RUTAS_PANEL.papelera },
  { vieja: "/dashboard/agenda", nueva: RUTAS_PANEL.pedidos },
];
