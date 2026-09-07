/* Las instrucciones al modelo viven acá y no dentro de las rutas: son el
   verdadero código de estas funciones. Ajustar una coma cambia el resultado
   más que cualquier refactor, así que conviene poder leerlas juntas, verlas en
   el commit y probarlas sin levantar el servidor. */

export const ESQUEMA_PRODUCTO = {
  type: "object",
  properties: {
    nombre: { type: "string" },
    descripcion: { type: "string" },
    categoria: { type: "string" },
    confianza: { type: "string", enum: ["alta", "media", "baja"] },
  },
  required: ["nombre", "descripcion", "categoria", "confianza"],
} as const;

export type ProductoLeido = {
  nombre: string;
  descripcion: string;
  categoria: string;
  confianza: "alta" | "media" | "baja";
};

/* Se le prohíbe explícitamente inventar marca, peso y sabor. Sin esa
   prohibición el modelo completa con lo más probable —«Aceite Fino 900 ml»
   cuando la etiqueta no se lee— y el dueño publica algo que no vende. */
export const INSTRUCCION_PRODUCTO = `Mirás la fotografía de un producto que un comerciante boliviano quiere publicar en su catálogo.

Devolvé:
- nombre: cómo lo llamaría el vendedor. Corto y concreto, en español de Bolivia. Máximo 60 caracteres.
- descripcion: una sola oración de venta, máximo 20 palabras.
- categoria: una o dos palabras que sirvan como categoría del catálogo.
- confianza: "alta" si se ve con claridad qué es; "media" si dudás; "baja" si no estás seguro.

Reglas que no se rompen:
- No inventes marca, peso, volumen, sabor ni ingredientes que no se lean o no se vean en la foto.
- No inventes precios. Nunca menciones un precio.
- Si no reconocés el producto, devolvé nombre vacío y confianza "baja".
- Escribí en español, sin emojis y sin signos de admiración.`;

export const ESQUEMA_LISTA = {
  type: "object",
  properties: {
    productos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          precio: { type: "number" },
          descripcion: { type: "string" },
          categoria: { type: "string" },
          confianza: { type: "string", enum: ["alta", "media", "baja"] },
        },
        required: ["nombre", "precio", "descripcion", "categoria", "confianza"],
      },
    },
    es_lista_de_precios: { type: "boolean" },
  },
  required: ["productos", "es_lista_de_precios"],
} as const;

export type ListaLeida = {
  productos: Array<{
    nombre: string;
    precio: number;
    descripcion: string;
    categoria: string;
    confianza: "alta" | "media" | "baja";
  }>;
  es_lista_de_precios: boolean;
};

/* «No inventes» va repetido y en primer lugar porque es el umbral que decide si
   esta función se publica: un producto que no está en la lista es una falla, no
   una imprecisión. El dueño publica algo que no vende y se entera cuando un
   cliente se lo reclama.

   `es_lista_de_precios` existe para poder decirle «esto no parece una lista»
   en vez de devolverle un invento sobre la foto de su estantería. */
export const INSTRUCCION_LISTA = `Leés la fotografía de una lista de precios de un negocio boliviano. Puede estar impresa, tipeada o escrita a mano.

Devolvé un producto por cada renglón que tenga un nombre y un precio.

Reglas que no se rompen:
- NO INVENTES productos. Si un renglón no se lee, no lo incluyas. Es preferible devolver menos productos que uno que no está.
- No completes precios que no se leen. Si el nombre está pero el precio no, no incluyas ese renglón.
- Los precios son bolivianos. "10.-", "Bs 10", "10 Bs" y "10" son todos 10.
- Si un renglón trae dos precios (por ejemplo "35/45" o dos tamaños), devolvé dos productos con el tamaño en el nombre.
- Si dice "2x15", el precio del producto es 15 y aclarás "por 2" en el nombre.
- Los títulos de sección NO son productos, pero tampoco se tiran: "BEBIDAS", "ALMUERZOS", "FERRETERÍA" son la categoría de todos los productos que vienen debajo, hasta el título siguiente. Poné ese título en el campo categoria de cada producto, escrito como nombre propio y no en mayúsculas: "Bebidas", "Almuerzos".
- Si la lista no tiene títulos de sección, dejá categoria vacía en todos.
- descripcion: solo si el renglón trae detalle además del nombre, por ejemplo "Silpancho — carne apanada, arroz, papa y huevo". Si no hay detalle, dejala vacía. No la inventes ni la deduzcas de lo que sabés del plato.
- confianza: "alta" si el nombre y el precio se leen sin esfuerzo; "baja" si tuviste que adivinar alguna letra o número.
- Escribí TODO en español, incluidos los nombres y las categorías. Si la lista tiene una palabra en otro idioma que es el nombre propio del producto, dejala como está; todo lo demás va en español.
- es_lista_de_precios: false si la foto no es una lista de precios, por ejemplo si es una estantería, una vitrina o un producto suelto. En ese caso devolvé la lista de productos vacía.`;
