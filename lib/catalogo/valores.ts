import { formatearValor, type Atributo } from "./atributos";

/* Los valores que un producto guarda para los campos de su categoría.
 *
 * La otra mitad de `atributos.ts`: allá se declara qué datos lleva la categoría,
 * acá se comprueba lo que el producto trae. Las dos son puras y las usan el
 * formulario del panel, la API, la importación desde Excel y lo que devuelve la
 * IA. Que sea el mismo código en los cuatro lugares es el punto: si la
 * importación aceptara algo que el formulario rechaza, el dueño tendría
 * productos que no puede volver a guardar.
 */

export type ValorAtributo = string | number | boolean;

export const LARGO_VALOR_TEXTO = 80;

function textoLimpio(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/* Valida los valores contra las definiciones de su categoría.
 *
 * Las definiciones mandan: una llave que no corresponde a ningún campo **se
 * descarta**, no se rechaza. Es el caso de un producto que cambia de categoría,
 * y rechazarlo dejaría al dueño sin poder guardar un producto que él ve bien.
 */
export function validarValores(
  atributos: ReadonlyArray<Atributo>,
  crudos: unknown,
):
  | { correcto: true; valores: Record<string, ValorAtributo> }
  | { correcto: false; errores: Record<string, string> } {
  const errores: Record<string, string> = {};
  const valores: Record<string, ValorAtributo> = {};

  const entrada =
    typeof crudos === "object" && crudos !== null && !Array.isArray(crudos)
      ? (crudos as Record<string, unknown>)
      : {};

  for (const atributo of atributos) {
    const campo = `atributos.${atributo.clave}`;
    const crudo = entrada[atributo.clave];
    /* Un texto de solo espacios cuenta como vacío. Sin esto se guardaba como
       cadena vacía y el producto figuraba con el campo cargado: la ficha dibujaba
       una fila en blanco y el aviso al borrar contaba un valor que no existe. Lo
       encontró una prueba con «   ». */
    const vacio =
      crudo === undefined ||
      crudo === null ||
      crudo === "" ||
      (typeof crudo === "string" && crudo.trim() === "");

    if (vacio) {
      /* Un campo vacío no se guarda como cadena vacía: se omite. Así
         `Object.keys(atributos)` dice qué está cargado de verdad, que es lo que
         cuenta el aviso al borrar un campo y lo que decide si la ficha dibuja
         una fila. */
      if (atributo.obligatorio) {
        errores[campo] = `Completá ${atributo.nombre}.`;
      }
      continue;
    }

    if (atributo.tipo === "si_no") {
      /* Se aceptan las cadenas «true» y «false» además del booleano: un
         formulario HTML y una planilla de Excel mandan texto, y exigir el
         booleano obligaría a convertir en cada uno de los cuatro lugares que
         llaman a esto. */
      if (typeof crudo === "boolean") {
        valores[atributo.clave] = crudo;
      } else if (crudo === "true" || crudo === "false") {
        valores[atributo.clave] = crudo === "true";
      } else {
        errores[campo] = `${atributo.nombre} solo admite sí o no.`;
      }
      continue;
    }

    if (atributo.tipo === "numero") {
      const numero = typeof crudo === "number" ? crudo : Number(textoLimpio(crudo));
      if (!Number.isFinite(numero)) {
        errores[campo] = `${atributo.nombre} tiene que ser un número.`;
      } else if (numero < 0) {
        errores[campo] = `${atributo.nombre} no puede ser negativo.`;
      } else {
        valores[atributo.clave] = numero;
      }
      continue;
    }

    const texto = textoLimpio(crudo);
    if (atributo.tipo === "opcion") {
      if (!atributo.opciones.includes(texto)) {
        /* Se enumeran las opciones en el mensaje: sin ellas, quien importa una
           planilla con «e27» en minúscula lee «no es válida» y no tiene forma de
           saber que el problema es la mayúscula. */
        errores[campo] = `${atributo.nombre} admite: ${atributo.opciones.join(", ")}.`;
      } else {
        valores[atributo.clave] = texto;
      }
      continue;
    }

    if (texto.length > LARGO_VALOR_TEXTO) {
      errores[campo] = `${atributo.nombre} admite hasta ${LARGO_VALOR_TEXTO} caracteres.`;
    } else {
      valores[atributo.clave] = texto;
    }
  }

  return Object.keys(errores).length > 0
    ? { correcto: false, errores }
    : { correcto: true, valores };
}

/* Lee lo que ya está guardado, sin quejarse.
 *
 * Se usa al dibujar el catálogo público y al abrir el formulario. Un valor que
 * dejó de corresponder —porque el campo se borró, cambió de tipo, o el producto
 * cambió de categoría— se descarta en silencio: no hay a quién avisarle y no
 * puede dejar la ficha sin cargar.
 */
export function leerValores(
  atributos: ReadonlyArray<Atributo>,
  crudos: unknown,
): Record<string, ValorAtributo> {
  const validacion = validarValores(
    /* Sin obligatorios: acá no se está guardando nada, se está leyendo. Un campo
       que se volvió obligatorio después no puede hacer desaparecer los valores
       que sí están cargados. */
    atributos.map((atributo) => ({ ...atributo, obligatorio: false })),
    crudos,
  );
  if (validacion.correcto) return validacion.valores;

  /* Si algo no valida, se rescata lo que sí: un casquillo mal escrito no puede
     borrar la potencia de la pantalla. */
  const valores: Record<string, ValorAtributo> = {};
  const entrada =
    typeof crudos === "object" && crudos !== null && !Array.isArray(crudos)
      ? (crudos as Record<string, unknown>)
      : {};
  for (const atributo of atributos) {
    const uno = validarValores([{ ...atributo, obligatorio: false }], entrada);
    if (uno.correcto && atributo.clave in uno.valores) {
      valores[atributo.clave] = uno.valores[atributo.clave];
    }
  }
  return valores;
}

export type ValorParaMostrar = { clave: string; nombre: string; texto: string };

/* Los pares «nombre: valor» listos para dibujar, en el orden de la categoría.
 *
 * Un solo lugar para los tres destinos —tarjeta, ficha y mensaje de WhatsApp—
 * porque los tres tienen que decir «9 W», no uno «9» y otro «9W». Lo que cambia
 * entre ellos es el filtro, no el formato.
 */
export function valoresParaMostrar(
  atributos: ReadonlyArray<Atributo>,
  crudos: unknown,
  donde: "tarjeta" | "ficha" | "resumen" = "ficha",
): ValorParaMostrar[] {
  const valores = leerValores(atributos, crudos);
  const salida: ValorParaMostrar[] = [];

  for (const atributo of atributos) {
    if (donde === "tarjeta" && !atributo.enTarjeta) continue;
    if (donde === "resumen" && !atributo.enResumen) continue;

    const valor = valores[atributo.clave];
    if (valor === undefined) continue;

    /* En la tarjeta, un «no» no se muestra. Ocupa el mismo lugar que un dato
       útil para informar una ausencia, y la tarjeta tiene lugar para seis cosas.
       En la ficha sí se muestra: ahí «Regulable: no» es una respuesta. */
    if (donde === "tarjeta" && atributo.tipo === "si_no" && valor === false) continue;

    const texto = formatearValor(atributo, valor);
    if (texto === null) continue;
    salida.push({ clave: atributo.clave, nombre: atributo.nombre, texto });
  }

  return salida;
}

/* La línea de la tarjeta: «9 W · E27 · Cálida».
 *
 * Van los valores sin su nombre, a propósito. En la tarjeta el espacio es una
 * línea y «Potencia: 9 W · Casquillo: E27» no entra; además quien mira una
 * ferretería entiende «E27» sin que le digan que es el casquillo. Los nombres
 * están en la ficha, que es donde se va a mirar el detalle. */
export function lineaDeTarjeta(
  atributos: ReadonlyArray<Atributo>,
  crudos: unknown,
): string | null {
  const partes = valoresParaMostrar(atributos, crudos, "tarjeta").map(({ texto }) => texto);
  return partes.length > 0 ? partes.join(" · ") : null;
}
