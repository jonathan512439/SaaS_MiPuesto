/* La apariencia de un catálogo se decide en tres ejes, no en uno.
 *
 *   Plantilla  ×  Tarjeta  ×  Paleta
 *   cómo se        cómo se      cómo se
 *   recorre        decide       ve
 *
 * Antes la plantilla decidía todo, y eso alcanzaba para siete rubros. Las 44
 * fichas de `Catalogos_Ejemplo/` piden unas seis formas de recorrer un catálogo
 * y unas seis formas de presentar un producto, combinadas distinto: separarlas
 * da doce catálogos donde había cuatro, y dieciocho cuando lleguen las dos
 * plantillas nuevas — sin dibujar dieciocho plantillas.
 *
 * **La plantilla es el armazón** del plan v3: la columna de la base sigue
 * llamándose `plantilla_id` y no se renombra. El concepto es el mismo y el
 * nombre está en la API, en el panel y en veinte archivos.
 */
export const PLANTILLAS = [
  "clasica",
  "moderna",
  "minimal",
  "feria",
  /* `catalogo` y `reserva` llegan con sus componentes, en el paso 1.3 de esta
     fase. No se declaran antes: dos pruebas del proyecto exigen que cada
     plantilla del registro tenga su archivo, y tienen razón — una plantilla
     declarada y no dibujada es una que el dueño puede elegir para quedarse con
     el catálogo en blanco. */
] as const;

/* Cómo se presenta un producto. Es el eje que faltaba.
 *
 * Las seis salieron de mirar las maquetas de teléfono de las 44 fichas: se
 * repiten seis formas, combinadas con armazones distintos. */
export const TARJETAS = [
  /* Fila con foto chica a la izquierda. Carta de restaurante, lista de precios. */
  "lista",
  /* Foto cuadrada arriba, datos debajo. La vitrina de siempre. */
  "cuadricula",
  /* Foto vertical 3:4, para ropa y calzado, donde la prenda manda. */
  "retrato",
  /* Fila compacta: foto chica, precio grande y sin descripción. Es la lista de
     precios de un puesto de mercado, y es también donde caben los dos atributos
     destacados de una ferretería. Se distingue de `lista` en que esa lleva
     descripción y la acción adentro de la fila. */
  "ficha",
  /* Sin foto o con foto redonda, duración y botón de agendar. */
  "servicio",
  /* Foto ancha 16:9 y precio con su unidad de tiempo: «Bs 590 / noche». */
  "estadia",
] as const;
export const PALETAS = [
  "mercado",
  "tierra",
  "oceano",
  "noche",
  "altiplano",
  "jazmin",
  "grafito",
] as const;

export type PlantillaId = (typeof PLANTILLAS)[number];
export type TarjetaId = (typeof TARJETAS)[number];
export type PaletaId = (typeof PALETAS)[number];

/* No toda combinación existe, y esa es la parte importante.
 *
 * Seis por seis serían treinta y seis, pero `feria` con `estadia` es una lista
 * de precios con fotos panorámicas: no es un diseño, es un accidente. Acá se
 * declaran las que sí, y **la primera de cada lista es la predeterminada**.
 *
 * Las cuatro predeterminadas de las plantillas que ya existían son las que
 * reproducen su aspecto actual. Ese es el criterio de la fase: un negocio que
 * hoy tiene `moderna` queda con `cuadricula` y se ve exactamente igual. */
export const TARJETAS_POR_PLANTILLA: Record<PlantillaId, ReadonlyArray<TarjetaId>> = {
  clasica: ["lista", "cuadricula", "ficha"],
  moderna: ["cuadricula", "retrato", "estadia"],
  /* Mínima admite una sola forma, y no por diseño sino por estructura: dibuja
     sus servicios con `dl`, `dt` y `dd`, y nueve reglas de su hoja dependen de
     esas etiquetas. Las demás tarjetas devuelven un `li`, que dentro de un `dl`
     es HTML inválido.
     Ofrecerle más obliga a reescribir su hoja entera, que es un trabajo real y
     no un olvido. Una plantilla con una sola forma es legítima: Mínima existe
     para listar servicios, y esa es la forma de listarlos. */
  minimal: ["servicio"],
  feria: ["ficha", "lista", "cuadricula"],
};

export function tarjetaPredeterminada(plantilla: PlantillaId): TarjetaId {
  return TARJETAS_POR_PLANTILLA[plantilla][0];
}

/* Una tarjeta que la plantilla no sabe dibujar se corrige sola en vez de
   romper la pantalla. Pasa cuando el dueño cambia de plantilla y la tarjeta que
   tenía no existe en la nueva: se le da la predeterminada, que es lo que él
   habría elegido. Es la misma regla del rubro: se ajusta la interfaz, nunca se
   pierde el dato. */
export function tarjetaValidaPara(plantilla: PlantillaId, tarjeta: unknown): TarjetaId {
  const admitidas = TARJETAS_POR_PLANTILLA[plantilla];
  return admitidas.includes(tarjeta as TarjetaId)
    ? (tarjeta as TarjetaId)
    : tarjetaPredeterminada(plantilla);
}

export function esTarjetaId(valor: unknown): valor is TarjetaId {
  return typeof valor === "string" && (TARJETAS as readonly string[]).includes(valor);
}

export const DEFINICIONES_PLANTILLAS: ReadonlyArray<{
  id: PlantillaId;
  nombre: string;
  enfoque: string;
  recomendacion: string;
}> = [
  {
    id: "clasica",
    nombre: "Clásica",
    enfoque: "Carta editorial",
    recomendacion: "Para restaurantes y negocios con categorías que conviene recorrer con calma.",
  },
  {
    id: "moderna",
    nombre: "Moderna",
    enfoque: "Vitrina visual",
    recomendacion: "Para tiendas donde las fotografías y las acciones rápidas ayudan a decidir.",
  },
  {
    id: "minimal",
    nombre: "Mínima",
    enfoque: "Servicios y contacto",
    recomendacion: "Para profesionales, reservas y negocios que priorizan atención directa.",
  },
  {
    id: "feria",
    nombre: "Feria",
    enfoque: "Lista de precios",
    recomendacion: "Para puestos de mercado y catálogos largos donde el precio decide la compra.",
  },
];

export const DEFINICIONES_TARJETAS: ReadonlyArray<{
  id: TarjetaId;
  nombre: string;
  descripcion: string;
}> = [
  { id: "lista", nombre: "Lista", descripcion: "Fila con foto chica y precio a la derecha." },
  { id: "cuadricula", nombre: "Cuadrícula", descripcion: "Foto cuadrada arriba y datos debajo." },
  { id: "retrato", nombre: "Retrato", descripcion: "Foto vertical grande, para ropa y calzado." },
  { id: "ficha", nombre: "Ficha", descripcion: "Fila compacta con el precio grande y lugar para dos datos." },
  { id: "servicio", nombre: "Servicio", descripcion: "Duración y botón de agendar, sin foto grande." },
  { id: "estadia", nombre: "Estadía", descripcion: "Foto ancha y precio por noche, hora o día." },
];

export const DEFINICIONES_PALETAS: ReadonlyArray<{
  id: PaletaId;
  nombre: string;
  descripcion: string;
}> = [
  { id: "mercado", nombre: "Mercado", descripcion: "Verde profundo y naranja cálido." },
  { id: "tierra", nombre: "Tierra", descripcion: "Cacao profundo con acento de ladrillo." },
  { id: "oceano", nombre: "Océano", descripcion: "Azules frescos con acento frambuesa." },
  { id: "noche", nombre: "Noche", descripcion: "Fondo oscuro con acentos claros y elegantes." },
  { id: "altiplano", nombre: "Altiplano", descripcion: "Violeta andino con acento carmín." },
  { id: "jazmin", nombre: "Jazmín", descripcion: "Ciruela suave con acento dorado." },
  { id: "grafito", nombre: "Grafito", descripcion: "Gris carbón con acento rojo." },
];

export const COMBINACIONES_APARIENCIA = PLANTILLAS.flatMap((plantilla) =>
  PALETAS.map((paleta) => ({ plantilla, paleta })),
);

/* Las combinaciones que de verdad existen: plantilla más tarjeta, con la paleta
   suelta porque toda paleta sirve con toda forma. Es lo que dibuja la hoja de
   contactos y lo que recorre el control de contraste. */
export const COMBINACIONES_DE_FORMA = PLANTILLAS.flatMap((plantilla) =>
  TARJETAS_POR_PLANTILLA[plantilla].map((tarjeta) => ({ plantilla, tarjeta })),
);
