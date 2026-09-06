import { LARGO_MAXIMO_ZONA, esCiudadId, type CiudadId } from "./lugares";
import { esRubroId, type RubroId } from "./rubros";

export const TIPOS_NEGOCIO = [
  "catalogo_estatico",
  "catalogo_cta",
  "tienda_virtual",
] as const;

export type TipoNegocio = (typeof TIPOS_NEGOCIO)[number];

export const SLUGS_RESERVADOS = new Set([
  "admin",
  "api",
  "actualizar-clave",
  "auth",
  "dashboard",
  "directorio",
  "estilos",
  "login",
  /* Faltaban tres, y no era inofensivo: una ruta estática le gana al slug, así
     que un negocio con uno de estos nombres pagaba, cargaba su catálogo y su
     dirección nunca abría. */
  "plataforma",
  "privacidad",
  "terminos",
  "recuperar-clave",
  "registro",
  /* La puerta de las etiquetas NFC. Sin reservarla, un negocio con el nombre
     «t» quedaría tapado por la ruta en cuanto tuviera una segunda página. */
  "t",
]);

export type DatosNegocioValidados = {
  nombre: string;
  slug: string;
  descripcion: string | null;
  tipo_negocio: TipoNegocio;
  telefono_whatsapp: string;
  rubro: RubroId | null;
  pide_numero_mesa: boolean;
  ciudad: CiudadId | null;
  zona: string | null;
};

export type ResultadoValidacionNegocio =
  | { correcto: true; datos: DatosNegocioValidados }
  | { correcto: false; errores: Record<string, string> };

const PATRON_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PATRON_TELEFONO_BOLIVIA = /^(?:591)?[67]\d{7}$/;

function textoDesde(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

export function normalizarSlug(valor: unknown) {
  return textoDesde(valor).toLowerCase();
}

export function proponerSlug(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

export function validarSlug(slug: string) {
  if (slug.length < 3 || slug.length > 48) {
    return "Usá entre 3 y 48 caracteres.";
  }

  if (!PATRON_SLUG.test(slug)) {
    return "Usá solo minúsculas, números y guiones, sin guiones al inicio o al final.";
  }

  if (SLUGS_RESERVADOS.has(slug)) {
    return "Ese nombre está reservado por MiPuesto. Elegí otro.";
  }

  return "";
}

export function normalizarTelefonoWhatsapp(valor: unknown) {
  const digitos = textoDesde(valor).replace(/[^0-9]/g, "");
  return digitos.length === 8 ? `591${digitos}` : digitos;
}

export function validarDatosNegocio(entrada: unknown): ResultadoValidacionNegocio {
  const objeto =
    typeof entrada === "object" && entrada !== null
      ? (entrada as Record<string, unknown>)
      : {};
  const nombre = textoDesde(objeto.nombre);
  const slug = normalizarSlug(objeto.slug);
  const descripcion = textoDesde(objeto.descripcion);
  const tipo = textoDesde(objeto.tipo_negocio);
  const rubro = textoDesde(objeto.rubro);
  const ciudad = textoDesde(objeto.ciudad);
  const zona = textoDesde(objeto.zona);
  const telefono = normalizarTelefonoWhatsapp(objeto.telefono_whatsapp);
  const errores: Record<string, string> = {};

  if (nombre.length < 2 || nombre.length > 80) {
    errores.nombre = "Escribí un nombre de entre 2 y 80 caracteres.";
  }

  const errorSlug = validarSlug(slug);
  if (errorSlug) errores.slug = errorSlug;

  if (descripcion.length > 500) {
    errores.descripcion = "La descripción puede tener hasta 500 caracteres.";
  }

  if (!TIPOS_NEGOCIO.includes(tipo as TipoNegocio)) {
    errores.tipo_negocio = "Elegí una modalidad válida.";
  }

  /* Vacío es válido y significa «no lo dijo»: quien no elige rubro ve el panel
     completo. Lo que no se acepta es un rubro inventado, que la base rechazaría
     recién al guardar con un error que el dueño no puede entender. */
  if (rubro && !esRubroId(rubro)) {
    errores.rubro = "Elegí un rubro de la lista.";
  }

  if (ciudad && !esCiudadId(ciudad)) {
    errores.ciudad = "Elegí una ciudad de la lista.";
  }

  if (zona.length > LARGO_MAXIMO_ZONA) {
    errores.zona = `La zona admite hasta ${LARGO_MAXIMO_ZONA} caracteres.`;
  }

  if (!PATRON_TELEFONO_BOLIVIA.test(telefono)) {
    errores.telefono_whatsapp =
      "Ingresá un celular boliviano de 8 dígitos que empiece con 6 o 7.";
  }

  if (Object.keys(errores).length > 0) {
    return { correcto: false, errores };
  }

  return {
    correcto: true,
    datos: {
      nombre,
      slug,
      descripcion: descripcion || null,
      tipo_negocio: tipo as TipoNegocio,
      telefono_whatsapp: telefono,
      rubro: esRubroId(rubro) ? rubro : null,
      pide_numero_mesa: objeto.pide_numero_mesa === true,
      ciudad: esCiudadId(ciudad) ? ciudad : null,
      zona: zona || null,
    },
  };
}
