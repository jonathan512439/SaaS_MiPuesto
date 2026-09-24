/* Los campos que declara una categoría.
 *
 * Es una función pura: no sabe de sesiones ni de base. Se usa en el editor del
 * panel, en la API y —desde la fase 3— en la importación y en lo que devuelve la
 * IA. Que sea el mismo código en los cuatro lugares es el punto: una definición
 * que el editor acepta y la importación rechaza le haría perder productos al
 * dueño sin explicación.
 */

export const TIPOS_ATRIBUTO = ["texto", "numero", "opcion", "si_no"] as const;
export type TipoAtributo = (typeof TIPOS_ATRIBUTO)[number];

/* Diez por categoría y seis en la tarjeta, y los mismos números que hace cumplir
   el disparador de la base. Están acá para poder avisar antes de guardar, y allá
   para que una petición armada a mano tampoco pase. */
export const MAXIMO_ATRIBUTOS = 10;
export const MAXIMO_EN_TARJETA = 6;
export const MINIMO_OPCIONES = 2;
export const MAXIMO_OPCIONES = 24;
export const LARGO_NOMBRE = 40;
export const LARGO_UNIDAD = 12;

export type Atributo = {
  clave: string;
  nombre: string;
  tipo: TipoAtributo;
  unidad: string | null;
  opciones: string[];
  obligatorio: boolean;
  enTarjeta: boolean;
  enResumen: boolean;
};

export const DEFINICIONES_TIPOS: ReadonlyArray<{
  id: TipoAtributo;
  nombre: string;
  ejemplo: string;
  ayuda: string;
}> = [
  {
    id: "texto",
    nombre: "Texto",
    ejemplo: "Material: Acero inoxidable",
    ayuda: "Para lo que se escribe libre. Hasta 80 caracteres.",
  },
  {
    id: "numero",
    nombre: "Número con unidad",
    ejemplo: "Potencia: 9 W",
    ayuda: "Para medidas. La unidad la escribís una vez acá, no en cada producto.",
  },
  {
    id: "opcion",
    nombre: "Lista de opciones",
    ejemplo: "Casquillo: E27 · E14 · GU10",
    ayuda: "Cuando las respuestas posibles son pocas y siempre las mismas.",
  },
  {
    id: "si_no",
    nombre: "Sí o no",
    ejemplo: "Regulable: sí",
    ayuda: "Para lo que un producto tiene o no tiene.",
  },
];

/* El ejemplo de cada tipo según el rubro del negocio vive en
   `guias-por-rubro.ts`, junto con el resto de las ayudas del catálogo. */

export function esTipoAtributo(valor: unknown): valor is TipoAtributo {
  return typeof valor === "string" && (TIPOS_ATRIBUTO as readonly string[]).includes(valor);
}

/* La clave se deriva del nombre y el dueño no la escribe nunca.
 *
 * Pedirle que invente un identificador sería pedirle que entienda por qué existe.
 * Y es importante que **no cambie al renombrar el campo**: si la clave saliera
 * del nombre cada vez, corregir «Potencia» por «Potencia (W)» dejaría huérfano el
 * valor de todos los productos. Por eso esto corre una sola vez, al crear.
 */
export function claveDesdeNombre(nombre: string, yaUsadas: ReadonlyArray<string> = []): string {
  const base = Array.from(nombre.normalize("NFD"))
    .filter((caracter) => {
      const codigo = caracter.codePointAt(0) ?? 0;
      return codigo < 0x300 || codigo > 0x36f;
    })
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 31);

  /* Un nombre que se queda sin nada utilizable —«¿?», «---», «ñ»— tiene que dar
     una clave válida igual. La base exige empezar por letra **y al menos dos
     caracteres**: `^[a-z][a-z0-9_]{1,30}$`. Los dos casos se arreglan con el
     mismo prefijo, y el del largo lo descubrió una prueba con «ñ», que limpio
     queda en una sola letra. */
  const conLetra = /^[a-z]/.test(base) ? base : `campo_${base}`;
  const conLargo = conLetra.length >= 2 ? conLetra : `campo_${conLetra}`;
  const limpia = conLargo.slice(0, 31).replace(/_+$/g, "") || "campo";

  if (!yaUsadas.includes(limpia)) return limpia;
  for (let sufijo = 2; sufijo < 100; sufijo += 1) {
    const candidata = `${limpia.slice(0, 28)}_${sufijo}`;
    if (!yaUsadas.includes(candidata)) return candidata;
  }
  return `campo_${Date.now().toString(36)}`.slice(0, 31);
}

function textoLimpio(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/* Valida el conjunto completo, no un campo suelto.
 *
 * Se valida junto porque tres de las reglas son sobre el conjunto: el tope de
 * diez, el de seis en la tarjeta y que no se repitan nombres. Un validador
 * por campo no puede ver ninguna de las tres, y el editor guarda todo de una vez.
 *
 * Los errores vuelven con la posición adentro de la clave —`atributos.2.opciones`—
 * para que el formulario marque el campo exacto, igual que hacen los banners.
 */
export function validarAtributos(
  crudos: unknown,
): { correcto: true; atributos: Atributo[] } | { correcto: false; errores: Record<string, string> } {
  const errores: Record<string, string> = {};

  if (crudos === undefined || crudos === null) return { correcto: true, atributos: [] };
  if (!Array.isArray(crudos)) {
    return { correcto: false, errores: { atributos: "No se pudo leer la lista de campos." } };
  }
  if (crudos.length > MAXIMO_ATRIBUTOS) {
    errores.atributos = `Una categoría admite hasta ${MAXIMO_ATRIBUTOS} campos.`;
    return { correcto: false, errores };
  }

  const atributos: Atributo[] = [];
  const clavesVistas = new Set<string>();
  /* Los nombres se vigilan aparte de las claves, y no es lo mismo.
     Dos campos llamados «Material» son un error del dueño y hay que decírselo.
     Dos campos con nombres distintos que dan la misma clave —«Peso (kg)» y
     «Peso kg»— no son un error: ahí la clave se desempata con un sufijo y el
     dueño ni se entera, porque la clave no la escribe nunca. */
  const nombresVistos = new Set<string>();
  let enTarjeta = 0;

  crudos.forEach((crudo, indice) => {
    const campo = (llave: string) => `atributos.${indice}.${llave}`;
    if (typeof crudo !== "object" || crudo === null) {
      errores[`atributos.${indice}`] = "No se pudo leer este campo.";
      return;
    }
    const dato = crudo as Record<string, unknown>;

    const nombre = textoLimpio(dato.nombre);
    if (nombre === "") {
      errores[campo("nombre")] = "Escribí cómo se llama el campo.";
    } else if (nombre.length > LARGO_NOMBRE) {
      errores[campo("nombre")] = `Hasta ${LARGO_NOMBRE} caracteres.`;
    }

    if (!esTipoAtributo(dato.tipo)) {
      errores[campo("tipo")] = "Elegí qué clase de dato es.";
      return;
    }
    const tipo = dato.tipo;

    const repetido = nombre.toLocaleLowerCase("es");
    if (nombresVistos.has(repetido)) {
      errores[campo("nombre")] = "Ya hay otro campo con este nombre.";
    }
    nombresVistos.add(repetido);

    /* La clave llega desde el cliente porque un campo que ya existe tiene que
       conservar la suya: recalcularla acá desde el nombre rompería los valores ya
       cargados en cuanto el dueño corrija un rótulo. Lo que sí se hace es
       comprobar su forma, y derivarla si viene vacía —un campo nuevo—. */
    const clave = textoLimpio(dato.clave) || claveDesdeNombre(nombre, [...clavesVistas]);
    if (!/^[a-z][a-z0-9_]{1,30}$/.test(clave)) {
      errores[campo("clave")] = "El identificador del campo no es válido.";
    } else if (clavesVistas.has(clave)) {
      /* Con nombres distintos esto no debería pasar, porque `claveDesdeNombre`
         desempata. Llega acá cuando el cliente manda dos claves iguales a mano,
         y entonces sí es un error: una pisaría el valor de la otra en todos los
         productos. */
      errores[campo("clave")] = "Hay dos campos con el mismo identificador.";
    }
    clavesVistas.add(clave);

    const unidadCruda = textoLimpio(dato.unidad);
    let unidad: string | null = null;
    if (tipo === "numero") {
      if (unidadCruda.length > LARGO_UNIDAD) {
        errores[campo("unidad")] = `La unidad admite hasta ${LARGO_UNIDAD} caracteres.`;
      }
      /* Vacía es válida: «Año desde» es un número sin unidad. */
      unidad = unidadCruda === "" ? null : unidadCruda;
    } else if (unidadCruda !== "") {
      errores[campo("unidad")] = "Solo los campos de número llevan unidad.";
    }

    let opciones: string[] = [];
    if (tipo === "opcion") {
      const lista = Array.isArray(dato.opciones) ? dato.opciones : [];
      /* Se limpian y se quitan las repetidas antes de contar: una lista con
         «E27», «E27 » y «» tiene una sola opción de verdad, y decirle al dueño
         que tiene tres lo dejaría buscando el error donde no está. */
      opciones = [...new Set(lista.map(textoLimpio).filter((opcion) => opcion !== ""))];
      if (opciones.length < MINIMO_OPCIONES) {
        errores[campo("opciones")] = `Escribí al menos ${MINIMO_OPCIONES} opciones distintas.`;
      } else if (opciones.length > MAXIMO_OPCIONES) {
        errores[campo("opciones")] = `Hasta ${MAXIMO_OPCIONES} opciones.`;
      }
      if (opciones.some((opcion) => opcion.length > 40)) {
        errores[campo("opciones")] = "Cada opción admite hasta 40 caracteres.";
      }
    } else if (Array.isArray(dato.opciones) && dato.opciones.length > 0) {
      errores[campo("opciones")] = "Solo los campos de lista llevan opciones.";
    }

    const mostrarEnTarjeta = dato.enTarjeta === true;
    if (mostrarEnTarjeta) enTarjeta += 1;

    atributos.push({
      clave,
      nombre,
      tipo,
      unidad,
      opciones,
      obligatorio: dato.obligatorio === true,
      enTarjeta: mostrarEnTarjeta,
      /* Por omisión sí: si el dueño se tomó el trabajo de cargar el dato, lo más
         probable es que quiera que llegue en el pedido. */
      enResumen: dato.enResumen !== false,
    });
  });

  if (enTarjeta > MAXIMO_EN_TARJETA) {
    errores.atributos =
      `Hasta ${MAXIMO_EN_TARJETA} campos se ven en la tarjeta. Los demás se siguen mostrando ` +
      "en la ficha del producto.";
  }

  return Object.keys(errores).length > 0
    ? { correcto: false, errores }
    : { correcto: true, atributos };
}

/* Lee lo que ya está guardado, sin quejarse.
 *
 * Es lo contrario del validador y se usa donde no hay a quién avisarle: al
 * dibujar el catálogo público. Un campo mal formado no puede dejar la ficha sin
 * cargar, así que se descarta en silencio. */
export function leerAtributos(filas: unknown): Atributo[] {
  if (!Array.isArray(filas)) return [];
  const atributos: Atributo[] = [];
  for (const fila of filas) {
    if (typeof fila !== "object" || fila === null) continue;
    const dato = fila as Record<string, unknown>;
    const clave = textoLimpio(dato.clave);
    const nombre = textoLimpio(dato.nombre);
    if (clave === "" || nombre === "" || !esTipoAtributo(dato.tipo)) continue;
    atributos.push({
      clave,
      nombre,
      tipo: dato.tipo,
      unidad: textoLimpio(dato.unidad) || null,
      opciones: Array.isArray(dato.opciones)
        ? dato.opciones.map(textoLimpio).filter((opcion) => opcion !== "")
        : [],
      obligatorio: dato.obligatorio === true,
      enTarjeta: dato.en_tarjeta === true || dato.enTarjeta === true,
      enResumen: dato.en_resumen !== false && dato.enResumen !== false,
    });
  }
  return atributos;
}

/* Cómo se lee un valor en pantalla, con su unidad pegada. Vive acá y no en cada
   componente porque lo usan la tarjeta, la ficha y el mensaje de WhatsApp, y los
   tres tienen que decir «9 W», no uno «9» y otro «9W». */
export function formatearValor(atributo: Atributo, valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (atributo.tipo === "si_no") {
    if (typeof valor !== "boolean") return null;
    /* Un «no» no se muestra: la tarjeta diría «Regulable: no», que ocupa el
       mismo lugar que un dato útil para informar una ausencia. En la ficha, en
       cambio, sí se muestra, y eso lo decide quien dibuja, no esto. */
    return valor ? "Sí" : "No";
  }
  if (atributo.tipo === "numero") {
    const numero = typeof valor === "number" ? valor : Number(valor);
    if (!Number.isFinite(numero)) return null;
    return atributo.unidad ? `${numero} ${atributo.unidad}` : String(numero);
  }
  return typeof valor === "string" ? valor : null;
}
