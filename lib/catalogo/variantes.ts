/* Las presentaciones de un producto: talla, color, tamaño.
 *
 * Pura, como el resto de `lib/catalogo`. Lo que decide acá es qué es una
 * presentación válida; quién puede guardarla lo decide la ruta.
 */

export const MAXIMO_VARIANTES = 12;
export const LARGO_NOMBRE_VARIANTE = 40;

export type Variante = {
  nombre: string;
  /* Nulo significa «el mismo precio que el producto», que es el caso común: una
     remera en tres tallas cuesta lo mismo. */
  precio: number | null;
  /* Nulo significa «el producto no controla existencias, y esta tampoco». */
  cantidadStock: number | null;
  visible: boolean;
};

function textoLimpio(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function numeroONulo(valor: unknown): number | null | undefined {
  if (valor === undefined || valor === null || valor === "") return null;
  const numero = typeof valor === "number" ? valor : Number(textoLimpio(valor));
  return Number.isFinite(numero) ? numero : undefined;
}

/* Valida el conjunto entero, no una suelta.
 *
 * Dos de las reglas son sobre el conjunto: el tope de doce y que no se repita el
 * nombre. Y el editor guarda todo de una vez, igual que los campos de categoría.
 */
export function validarVariantes(
  crudas: unknown,
  contexto: { controlaStock: boolean; vendeTiempo: boolean } = {
    controlaStock: false,
    vendeTiempo: false,
  },
):
  | { correcto: true; variantes: Variante[] }
  | { correcto: false; errores: Record<string, string> } {
  const errores: Record<string, string> = {};

  if (crudas === undefined || crudas === null) return { correcto: true, variantes: [] };
  if (!Array.isArray(crudas)) {
    return { correcto: false, errores: { variantes: "No se pudo leer la lista." } };
  }

  /* Una categoría que vende tiempo no tiene presentaciones: tiene horarios, y
     esos los da la agenda. Aceptarlas acá dejaría un servicio con «3 kg» y
     «7,5 kg» colgando de una consulta veterinaria. */
  if (contexto.vendeTiempo && crudas.length > 0) {
    return {
      correcto: false,
      errores: {
        variantes:
          "Esta categoría vende tiempo, no cosas. Sus horarios se configuran en la agenda.",
      },
    };
  }

  if (crudas.length > MAXIMO_VARIANTES) {
    return {
      correcto: false,
      errores: { variantes: `Un producto admite hasta ${MAXIMO_VARIANTES} presentaciones.` },
    };
  }

  const variantes: Variante[] = [];
  const nombresVistos = new Set<string>();

  crudas.forEach((cruda, indice) => {
    const campo = (llave: string) => `variantes.${indice}.${llave}`;
    if (typeof cruda !== "object" || cruda === null) {
      errores[`variantes.${indice}`] = "No se pudo leer esta presentación.";
      return;
    }
    const dato = cruda as Record<string, unknown>;

    const nombre = textoLimpio(dato.nombre);
    if (nombre === "") {
      errores[campo("nombre")] = "Escribí cómo se llama.";
    } else if (nombre.length > LARGO_NOMBRE_VARIANTE) {
      errores[campo("nombre")] = `Hasta ${LARGO_NOMBRE_VARIANTE} caracteres.`;
    } else if (nombresVistos.has(nombre.toLocaleLowerCase("es"))) {
      errores[campo("nombre")] = "Ya hay otra presentación con este nombre.";
    }
    nombresVistos.add(nombre.toLocaleLowerCase("es"));

    const precio = numeroONulo(dato.precio);
    if (precio === undefined) {
      errores[campo("precio")] = "El precio tiene que ser un número.";
    } else if (precio !== null && precio < 0) {
      errores[campo("precio")] = "El precio no puede ser negativo.";
    }

    const cantidadStock = numeroONulo(dato.cantidadStock);
    if (cantidadStock === undefined || (cantidadStock !== null && !Number.isInteger(cantidadStock))) {
      errores[campo("cantidadStock")] = "Las existencias van en números enteros.";
    } else if (cantidadStock !== null && cantidadStock < 0) {
      errores[campo("cantidadStock")] = "Las existencias no pueden ser negativas.";
    } else if (cantidadStock !== null && !contexto.controlaStock) {
      /* Se avisa en vez de guardarlo callado: un número de existencias en un
         producto que no las controla no se muestra en ninguna parte, y el dueño
         quedaría creyendo que lo está llevando. */
      errores[campo("cantidadStock")] =
        "Para llevar existencias por presentación, activá «Controlar existencias» en el producto.";
    }

    variantes.push({
      nombre,
      precio: precio ?? null,
      cantidadStock: cantidadStock ?? null,
      visible: dato.visible !== false,
    });
  });

  return Object.keys(errores).length > 0
    ? { correcto: false, errores }
    : { correcto: true, variantes };
}

/* Lee lo guardado sin quejarse, para dibujar el catálogo. */
export function leerVariantes(filas: unknown): Array<Variante & { id: string }> {
  if (!Array.isArray(filas)) return [];
  const variantes: Array<Variante & { id: string }> = [];
  for (const fila of filas) {
    if (typeof fila !== "object" || fila === null) continue;
    const dato = fila as Record<string, unknown>;
    const nombre = textoLimpio(dato.nombre);
    const id = textoLimpio(dato.id);
    if (nombre === "" || id === "") continue;
    const precio = numeroONulo(dato.precio);
    const stock = numeroONulo(dato.cantidad_stock ?? dato.cantidadStock);
    variantes.push({
      id,
      nombre,
      precio: precio === undefined ? null : precio,
      cantidadStock: stock === undefined ? null : stock,
      visible: dato.visible !== false,
    });
  }
  return variantes;
}

/* El precio que de verdad paga quien elige esta presentación. Vive acá y no en
   cada pantalla porque lo usan la ficha, el carrito y el mensaje, y los tres
   tienen que decir lo mismo. */
export function precioDeVariante(precioProducto: number, variante: { precio: number | null }) {
  return variante.precio ?? precioProducto;
}
