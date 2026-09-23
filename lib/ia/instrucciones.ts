import type { CampoDeCategoria } from "./cobertura";

/* Las instrucciones al modelo viven acá y no dentro de las rutas: son el
   verdadero código de estas funciones. Ajustar una coma cambia el resultado
   más que cualquier refactor, así que conviene poder leerlas juntas, verlas en
   el commit y probarlas sin levantar el servidor. */

/* La respuesta del modelo cuando ninguna categoría del negocio le corresponde
   al producto. Entre paréntesis para que no se confunda con el nombre de una
   categoría de verdad; si un negocio tuviera una llamada así, se la deja afuera
   de la lista antes de mandarla. */
export const NINGUNA_CATEGORIA = "(ninguna)";

/* Cuántos nombres de categoría se mandan como máximo. Un catálogo real tiene
   entre cinco y treinta; el tope está para que un negocio con cientos no
   convierta cada lectura en una lista interminable. Van en el orden en que el
   dueño las acomodó. */
export const MAXIMO_CATEGORIAS_PARA_IA = 80;

/* Los nombres que se le ofrecen al modelo: sin repetidos, sin vacíos y sin el
   que choca con la respuesta de «ninguna». */
export function categoriasParaElegir(nombres: readonly string[]): string[] {
  const vistos = new Set<string>();
  const elegibles: string[] = [];
  for (const nombre of nombres) {
    const limpio = nombre.trim();
    const clave = limpio.toLowerCase();
    if (!limpio || clave === NINGUNA_CATEGORIA || vistos.has(clave)) continue;
    vistos.add(clave);
    elegibles.push(limpio);
    if (elegibles.length === MAXIMO_CATEGORIAS_PARA_IA) break;
  }
  return elegibles;
}

/* El esquema se arma con las categorías del negocio: el campo `categoria` solo
   admite una de ellas o «ninguna». Así el modelo no puede proponer una
   categoría inventada que después no coincide con nada. Sin categorías no hay
   de dónde elegir y el campo queda libre, pero la respuesta se descarta igual. */
export function esquemaProducto(categorias: readonly string[]) {
  return {
    type: "object",
    properties: {
      nombre: { type: "string" },
      descripcion: { type: "string" },
      categoria: categorias.length
        ? { type: "string", enum: [...categorias, NINGUNA_CATEGORIA] }
        : { type: "string" },
      confianza: { type: "string", enum: ["alta", "media", "baja"] },
    },
    required: ["nombre", "descripcion", "categoria", "confianza"],
  } as const;
}

/* Qué categoría eligió, entre las del negocio. La coincidencia se hace sin
   mayúsculas ni espacios de más aunque el esquema ya la obligue a ser exacta:
   si el modelo se sale de la lista, la respuesta se ignora y el producto queda
   sin categoría, que es lo mismo que decir «ninguna». */
export function categoriaQueEligio<T extends { nombre: string }>(
  respuesta: string | undefined,
  categorias: readonly T[],
): T | null {
  const clave = (respuesta ?? "").trim().toLowerCase();
  if (!clave || clave === NINGUNA_CATEGORIA) return null;
  return categorias.find((categoria) => categoria.nombre.trim().toLowerCase() === clave) ?? null;
}

export type ProductoLeido = {
  nombre: string;
  descripcion: string;
  categoria: string;
  confianza: "alta" | "media" | "baja";
};

/* La categoría se elige de las que el negocio ya tiene, nunca se inventa.
   Antes el modelo proponía una o dos palabras sin conocer el catálogo, y solo
   servían si coincidían letra por letra con una categoría existente: «Bebidas»
   no entraba en «Refrescos». Crear una categoría sigue sin ser algo que decida
   una foto; si ninguna corresponde, el producto queda sin categoría y el dueño
   elige. */
function reglaDeCategoria(categorias: readonly string[]): string {
  if (!categorias.length) {
    return `- categoria: devolvé "" (el negocio todavía no tiene categorías).`;
  }
  return `- categoria: elegí UNA de estas categorías que el negocio ya tiene, la que mejor le corresponda al producto:
${categorias.map((nombre) => `  - ${nombre}`).join("\n")}
  Devolvé el nombre exactamente como está escrito. Si ninguna le corresponde de verdad, devolvé "${NINGUNA_CATEGORIA}": un producto en una categoría equivocada se pierde en el catálogo, y es mejor dejarlo sin categoría. No inventes una categoría nueva.`;
}

/* Se le prohíbe explícitamente inventar marca, peso y sabor. Sin esa
   prohibición el modelo completa con lo más probable —«Aceite Fino 900 ml»
   cuando la etiqueta no se lee— y el dueño publica algo que no vende. */
export function instruccionProducto(categorias: readonly string[]): string {
  return `Mirás la fotografía de un producto que un comerciante boliviano quiere publicar en su catálogo.

Devolvé:
- nombre: cómo lo llamaría el vendedor. Corto y concreto, en español de Bolivia. Máximo 60 caracteres.
- descripcion: una sola oración de venta, máximo 20 palabras.
${reglaDeCategoria(categorias)}
- confianza: "alta" si se ve con claridad qué es; "media" si dudás; "baja" si no estás seguro.

Reglas que no se rompen:
- No inventes marca, peso, volumen, sabor ni ingredientes que no se lean o no se vean en la foto.
- No inventes precios. Nunca menciones un precio.
- Si no reconocés el producto, devolvé nombre vacío y confianza "baja".
- Escribí en español, sin emojis y sin signos de admiración.`;
}

/* El esquema de la lista se arma con las categorías del negocio, igual que el
   de la foto de un producto: `categoria_del_negocio` solo admite una de ellas o
   «ninguna». Sin categorías el campo no existe, y el título de sección sigue
   siendo la única pista, como antes. */
export function esquemaLista(categorias: readonly string[]) {
  const propiedadesExtra = categorias.length
    ? { categoria_del_negocio: { type: "string", enum: [...categorias, NINGUNA_CATEGORIA] } }
    : {};
  return {
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
          ...propiedadesExtra,
          confianza: { type: "string", enum: ["alta", "media", "baja"] },
          /* Los datos que la categoría del negocio pide: la marca de un
             repuesto, el volumen de una gaseosa. Van como lista de pares y no
             como un objeto con propiedades fijas porque **cada negocio tiene
             campos distintos**, y el esquema que se le manda al modelo es uno
             solo. Las claves se validan contra las de verdad al volver: lo que
             el modelo invente se descarta. */
          datos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                clave: { type: "string" },
                valor: { type: "string" },
              },
              required: ["clave", "valor"],
            },
          },
        },
        /* `datos` queda fuera de los obligatorios: un negocio sin campos
           declarados no tiene nada que completar, y exigirle al modelo una lista
           vacía en cada renglón es gastar tokens en nada. */
        required: categorias.length
          ? ["nombre", "precio", "descripcion", "categoria", "categoria_del_negocio", "confianza"]
          : ["nombre", "precio", "descripcion", "categoria", "confianza"],
      },
    },
    es_lista_de_precios: { type: "boolean" },
  },
  required: ["productos", "es_lista_de_precios"],
  };
}

/* Cómo se le pide al modelo que ubique cada renglón en una categoría que el
   negocio ya tiene. Es la misma regla que en la foto de un producto: elegir la
   más parecida aunque el nombre no coincida —«BEBIDAS» va a «Refrescos»— y
   decir «ninguna» antes que forzar. El título de sección sigue viajando aparte,
   en `categoria`, porque es lo que el dueño escribió y la revisión lo muestra. */
export function instruccionDeCategoriasDelNegocio(categorias: readonly string[]): string {
  if (!categorias.length) return "";
  return `

El negocio ya tiene estas categorías:
${categorias.map((nombre) => `- ${nombre}`).join("\n")}

En "categoria_del_negocio" elige, para cada producto, la categoría de esa lista que mejor le corresponda. Si el renglón está bajo un título de sección, guíate por el título; si la lista no tiene títulos, por lo que es el producto. Devuelve el nombre exactamente como está escrito. Si ninguna le corresponde de verdad, devuelve "${NINGUNA_CATEGORIA}": un producto en una categoría equivocada se pierde en el catálogo.`;
}

export type ListaLeida = {
  productos: Array<{
    nombre: string;
    precio: number;
    descripcion: string;
    categoria: string;
    categoria_del_negocio?: string;
    confianza: "alta" | "media" | "baja";
    datos?: Array<{ clave: string; valor: string }>;
  }>;
  es_lista_de_precios: boolean;
};

/* Los campos que el negocio declaró, dichos al modelo en sus propias palabras.
 *
 * Esto es «la categoría como esquema»: el dueño ya definió que sus repuestos
 * tienen marca y modelo, y esa definición es la mejor pista que existe sobre qué
 * mirar en cada renglón. Sin ella el modelo devuelve nombre y precio y el dueño
 * completa cuarenta veces a mano lo que estaba escrito en la lista.
 *
 * **Se prohíbe deducir, igual que con la marca en la foto de un producto.** Un
 * modelo que sabe de autos completaría la marca de un repuesto por el nombre, y
 * el dueño publicaría un dato que nadie escribió. El informe de cobertura existe
 * justamente para que «no lo pude leer» sea una respuesta aceptable y visible.
 */
export function instruccionDeCamposDeCategoria(
  camposPorCategoria: ReadonlyMap<string, ReadonlyArray<CampoDeCategoria>>,
): string {
  const lineas = [...camposPorCategoria.entries()]
    .filter(([, campos]) => campos.length > 0)
    .map(([categoria, campos]) => {
      const detalle = campos
        .map((campo) => {
          const unidad = campo.unidad ? `, en ${campo.unidad}` : "";
          return `${campo.nombre} (clave "${campo.clave}"${unidad})`;
        })
        .join("; ");
      return `- ${categoria}: ${detalle}`;
    });

  if (lineas.length === 0) return "";

  return `\n\nEl negocio ya tiene categorías con datos propios. Cuando un renglón caiga en una de estas categorías Y el renglón diga alguno de esos datos, devolvelos en "datos", con la clave exacta entre comillas:\n${lineas.join("\n")}\n\nReglas de "datos", que no se rompen:\n- Solo si el dato está escrito en el renglón. NO lo deduzcas de lo que sabés del producto ni de su nombre.\n- Si no está, no devuelvas esa clave. Es correcto devolver "datos" vacío.\n- Usá únicamente las claves de la lista de arriba. No inventes claves nuevas.`;
}

/* «No inventes» va repetido y en primer lugar porque es el umbral que decide si
   esta función se publica: un producto que no está en la lista es una falla, no
   una imprecisión. El dueño publica algo que no vende y se entera cuando un
   cliente se lo reclama.

   `es_lista_de_precios` existe para poder decirle «esto no parece una lista»
   en vez de devolverle un invento sobre la foto de su estantería. */
export const INSTRUCCION_LISTA = `Leés la lista de precios de un negocio boliviano. Puede llegarte como fotografía o como PDF, y estar impresa, tipeada o escrita a mano.

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
- es_lista_de_precios: false si lo que recibiste no es una lista de precios, por ejemplo si es la foto de una estantería, de una vitrina o de un producto suelto, o un PDF que es un contrato, un folleto o una factura. En ese caso devolvé la lista de productos vacía.
- Si el PDF tiene varias páginas, leelas todas y devolvé los productos de todas, en orden. Los títulos de sección siguen valiendo aunque el título esté en una página y sus productos en la siguiente.`;
