import {
  GRUPOS_ICONOS,
  TERMINOS_ICONOS,
  TRAZOS_CATALOGO,
  type NombreIconoCatalogo,
} from "../../components/iconos/catalogo";

/* La identidad de una categoría: su ícono, si su esfera se muestra, y qué vende.
 *
 * Las tres son puras y no saben de sesiones ni de base. Lo que sí saben es que
 * **el ícono llega desde la base**, escrito alguna vez por el dueño, y que de
 * ahí va a parar a un `dangerouslySetInnerHTML`. Por eso ninguna función de acá
 * devuelve el nombre que le pasaron: devuelven uno del juego generado, o el
 * predeterminado. Un nombre que no está en el juego no puede llegar al dibujo.
 */

export const ICONO_PREDETERMINADO: NombreIconoCatalogo = "caja";

/* Qué vende una categoría. `cosas` habilita variantes y existencias; `tiempo`,
   agenda y citas. Es lo que separa una bolsa de 3 kg de un turno de las 10:00,
   que el diseño de referencia traía mezclados en el mismo campo. */
export const FORMAS_DE_VENDER = ["cosas", "tiempo"] as const;
export type FormaDeVender = (typeof FORMAS_DE_VENDER)[number];

export const DEFINICIONES_FORMAS_DE_VENDER: ReadonlyArray<{
  id: FormaDeVender;
  nombre: string;
  descripcion: string;
}> = [
  {
    id: "cosas",
    nombre: "Cosas",
    descripcion: "Productos con precio y existencias. Pueden tener presentaciones o tallas.",
  },
  {
    id: "tiempo",
    nombre: "Tiempo",
    descripcion: "Servicios con turno. Tu cliente elige día y hora de una agenda.",
  },
];

export function esIconoCatalogo(valor: unknown): valor is NombreIconoCatalogo {
  return typeof valor === "string" && Object.hasOwn(TRAZOS_CATALOGO, valor);
}

export function esFormaDeVender(valor: unknown): valor is FormaDeVender {
  return typeof valor === "string" && (FORMAS_DE_VENDER as readonly string[]).includes(valor);
}

/* Lo que se guardó alguna vez puede no existir hoy: un ícono se puede quitar del
   juego generado y las categorías que lo eligieron quedan apuntando a la nada.
   Se cae al predeterminado en silencio, porque una categoría sin dibujo es peor
   que una con el dibujo genérico. */
export function normalizarIcono(valor: unknown): NombreIconoCatalogo {
  return esIconoCatalogo(valor) ? valor : ICONO_PREDETERMINADO;
}

export function normalizarFormaDeVender(valor: unknown): FormaDeVender {
  return esFormaDeVender(valor) ? valor : "cosas";
}

/* Acá sí se avisa, en vez de caer al predeterminado: es lo que responde la API
   cuando el dueño manda algo que no existe, y guardarle otra cosa sin decirlo lo
   dejaría preguntándose por qué eligió un martillo y le quedó una caja. */
export function validarIdentidadCategoria(datos: {
  icono?: unknown;
  visible?: unknown;
  vende?: unknown;
}): { correcto: true } | { correcto: false; errores: Record<string, string> } {
  const errores: Record<string, string> = {};

  if (datos.icono !== undefined && !esIconoCatalogo(datos.icono)) {
    errores.icono = "Elige un ícono de la lista.";
  }
  if (datos.visible !== undefined && typeof datos.visible !== "boolean") {
    errores.visible = "Indica si la categoría se muestra o no.";
  }
  if (datos.vende !== undefined && !esFormaDeVender(datos.vende)) {
    errores.vende = "Indica si esta categoría vende cosas o tiempo.";
  }

  return Object.keys(errores).length > 0 ? { correcto: false, errores } : { correcto: true };
}

/* Las marcas que `NFD` separa de su letra: la tilde de la «á», la virgulilla de
   la «ñ». Van como números y no como un rango escrito dentro de una expresión
   regular porque son caracteres que se combinan con el anterior: pegados en el
   archivo se vuelven invisibles, o se montan sobre el corchete que tienen al
   lado, y el próximo que edite la línea no ve lo que está borrando. */
const PRIMERA_MARCA = 0x300;
const ULTIMA_MARCA = 0x36f;

function sinTildes(texto: string) {
  return Array.from(texto.normalize("NFD"))
    .filter((caracter) => {
      const codigo = caracter.codePointAt(0) ?? 0;
      return codigo < PRIMERA_MARCA || codigo > ULTIMA_MARCA;
    })
    .join("")
    .toLowerCase();
}

/* La búsqueda del selector.
 *
 * Compara sin tildes y sin distinguir mayúsculas, sobre el nombre y sobre los
 * términos: quien escribe «bombilla» tiene que encontrar el foco, y quien
 * escribe «lampara» sin tilde también. Ese es el punto de tener términos aparte
 * del nombre.
 *
 * Sin término devuelve todo, agrupado. Con término devuelve un solo grupo con
 * los resultados: partir doce coincidencias en seis grupos de dos hace más
 * difícil encontrarlas.
 */
export function buscarIconos(termino: string): ReadonlyArray<{
  id: string;
  titulo: string;
  iconos: ReadonlyArray<NombreIconoCatalogo>;
}> {
  const limpio = sinTildes(termino.trim());
  if (limpio === "") return GRUPOS_ICONOS;

  const palabras = limpio.split(/\s+/);
  const encontrados = (Object.keys(TRAZOS_CATALOGO) as NombreIconoCatalogo[]).filter((nombre) => {
    const donde = sinTildes(`${nombre} ${TERMINOS_ICONOS[nombre]}`);
    return palabras.every((palabra) => donde.includes(palabra));
  });

  if (encontrados.length === 0) return [];
  return [{ id: "resultados", titulo: "Resultados", iconos: encontrados }];
}

/* El juego que se ofrece primero, según el rubro. No limita: el selector muestra
   este grupo arriba y el resto debajo. Limitar obligaría a mantener una lista
   por rubro que siempre le va a faltar algo a alguien. */
const GRUPO_POR_RUBRO: Record<string, string> = {
  restaurante: "comida",
  ferreteria: "ferreteria",
  ropa_y_calzado: "ropa",
  distribuidora: "distribuidora",
  repuestos: "repuestos",
  veterinaria: "veterinaria",
  tienda_barrio: "distribuidora",
  belleza: "servicios",
  servicios: "servicios",
};

export function grupoSugeridoPara(rubro: string | null | undefined): string {
  return GRUPO_POR_RUBRO[rubro ?? ""] ?? "general";
}

export type { NombreIconoCatalogo };
