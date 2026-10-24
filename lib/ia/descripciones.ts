/* Las descripciones que escribe la IA donde la lista o la planilla no traen
 * ninguna.
 *
 * Es la excepción a «no inventes», y por eso tiene reglas propias. Una lista de
 * precios casi nunca trae descripción, y un catálogo con cuarenta productos sin
 * una línea de texto se ve abandonado. Pero la descripción **se escribe con lo
 * que el renglón dice** —el nombre, la categoría, los datos— y nada más: una
 * frase de venta sobre «Mochila escolar azul, 20 litros» puede decir que es
 * azul y que le entran 20 litros, no que es de lona ni que es impermeable.
 *
 * Y siempre llega **marcada como sugerida** en la revisión: es texto que el dueño
 * no escribió, y tiene que verlo antes de que lo vean sus clientes.
 */

/* Cuántos productos por pedido. Cada producto suma unas pocas decenas de
   tokens de ida y de vuelta; con sesenta la respuesta sigue llegando en pocos
   segundos, y una planilla más larga se describe en dos toques. */
export const MAXIMO_PARA_DESCRIBIR = 60;

/* Una oración corta: lo que entra en la tarjeta sin cortarse. */
export const LARGO_DESCRIPCION_SUGERIDA = 160;

export const REGLAS_DESCRIPCION_SUGERIDA = `- Una sola oración de venta, de 6 a 15 palabras, en español de Bolivia, con tuteo y sin "usted".
- Usa SOLO lo que está escrito: el nombre, la categoría y los datos. NO agregues material, medida, marca, sabor, ingredientes, garantía ni ninguna característica que no esté escrita.
- Nunca menciones precios, descuentos ni existencias.
- Sin emojis, sin signos de admiración y sin mayúsculas sostenidas.`;

/* Para la lectura de una foto o un PDF: se escribe en la misma consulta, sin
   gastar otra lectura. */
export const INSTRUCCION_DESCRIPCION_EN_LISTA = `

- descripcion_sugerida: solo si el renglón NO trae descripción. Escríbela así:
${REGLAS_DESCRIPCION_SUGERIDA.replace(/^- /gm, "  · ")}
  Si el renglón ya trae descripción, deja descripcion_sugerida vacía.`;

export type ProductoParaDescribir = {
  nombre: string;
  categoria: string;
  datos: Record<string, string>;
};

/* Para una planilla, que ya es texto: los productos van numerados en la
   instrucción y la respuesta vuelve por número, así un renglón que el modelo
   saltee no corre a los demás de lugar. */
export function instruccionDescripciones(productos: ReadonlyArray<ProductoParaDescribir>): string {
  const renglones = productos.map((producto, indice) => {
    const datos = Object.entries(producto.datos)
      .map(([nombre, valor]) => `${nombre}: ${valor}`)
      .join("; ");
    return `${indice}. ${producto.nombre}${producto.categoria ? ` (categoría ${producto.categoria})` : ""}${datos ? ` — ${datos}` : ""}`;
  });
  return `Escribes la descripción de los productos del catálogo de un negocio boliviano. Para cada producto de la lista, devuelve su número en "indice" y su descripción en "descripcion".

Reglas que no se rompen:
${REGLAS_DESCRIPCION_SUGERIDA}
- Si no puedes escribir nada sin inventar, devuelve la descripción vacía.

Productos:
${renglones.join("\n")}`;
}

export const ESQUEMA_DESCRIPCIONES = {
  type: "object",
  properties: {
    descripciones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          indice: { type: "integer" },
          descripcion: { type: "string" },
        },
        required: ["indice", "descripcion"],
      },
    },
  },
  required: ["descripciones"],
} as const;

/* Lo que se le muestra al dueño de lo que escribió el modelo: sin espacios de
   más, sin emojis ni signos de admiración —que la regla prohíbe, pero el modelo
   puede no cumplir— y del largo de una oración. */
export function limpiarDescripcionSugerida(texto: unknown): string {
  const limpia = String(texto ?? "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[¡!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (limpia.length <= LARGO_DESCRIPCION_SUGERIDA) return limpia;
  const cortada = limpia.slice(0, LARGO_DESCRIPCION_SUGERIDA);
  return `${cortada.slice(0, cortada.lastIndexOf(" ") > 0 ? cortada.lastIndexOf(" ") : cortada.length).trim()}…`;
}

/* Las respuestas, por número y solo las que existen: un índice fuera de rango
   o repetido se descarta, y una descripción vacía no cuenta. */
export function descripcionesValidas(respuesta: unknown, cantidad: number): Map<number, string> {
  const validas = new Map<number, string>();
  const lista = (respuesta as { descripciones?: unknown } | null)?.descripciones;
  if (!Array.isArray(lista)) return validas;
  for (const cruda of lista as Array<{ indice?: unknown; descripcion?: unknown }>) {
    const indice = Number(cruda?.indice);
    if (!Number.isInteger(indice) || indice < 0 || indice >= cantidad || validas.has(indice)) continue;
    const descripcion = limpiarDescripcionSugerida(cruda?.descripcion);
    if (descripcion) validas.set(indice, descripcion);
  }
  return validas;
}

/* Lo que manda el navegador, revisado en el servidor: hasta el máximo, con los
   largos de un producto y sin campos de más. Lo que no se puede leer se
   descarta entero, en vez de mandarle al modelo algo a medias. */
export function leerProductosParaDescribir(crudos: unknown): ProductoParaDescribir[] | null {
  if (!Array.isArray(crudos) || crudos.length === 0 || crudos.length > MAXIMO_PARA_DESCRIBIR) return null;
  const productos: ProductoParaDescribir[] = [];
  for (const crudo of crudos as Array<Record<string, unknown>>) {
    const nombre = typeof crudo?.nombre === "string" ? crudo.nombre.replace(/\s+/g, " ").trim().slice(0, 80) : "";
    if (!nombre) return null;
    const categoria = typeof crudo.categoria === "string" ? crudo.categoria.trim().slice(0, 60) : "";
    const datos: Record<string, string> = {};
    if (crudo.datos && typeof crudo.datos === "object" && !Array.isArray(crudo.datos)) {
      for (const [clave, valor] of Object.entries(crudo.datos as Record<string, unknown>).slice(0, 10)) {
        if (typeof valor !== "string" || !valor.trim()) continue;
        datos[clave.trim().slice(0, 40)] = valor.trim().slice(0, 80);
      }
    }
    productos.push({ nombre, categoria, datos });
  }
  return productos;
}
