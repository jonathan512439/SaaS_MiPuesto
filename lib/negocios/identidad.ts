export const TIPOS_IMAGEN_IDENTIDAD = ["logo", "portada", "qr"] as const;
export type TipoImagenIdentidad = (typeof TIPOS_IMAGEN_IDENTIDAD)[number];

/* Lo que responde `POST /api/negocios/identidad`. Es un solo tipo para la ruta
   y para las dos pantallas que suben imágenes, porque el alta leía `url` en la
   raíz cuando la ruta la manda dentro de `imagen`: el logo se guardaba y el
   dueño veía «No se pudo subir el logo». */
export type ImagenIdentidadSubida = { tipo: TipoImagenIdentidad; ruta: string; url: string };
export type RespuestaSubidaIdentidad = { error?: string; imagen?: ImagenIdentidadSubida };

export type RedesSocialesNegocio = {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  sitio_web?: string;
};

export const CAMPO_POR_TIPO_IMAGEN = {
  logo: "logo_url",
  portada: "portada_url",
  qr: "qr_pago_url",
} as const;

const CAMPOS_REDES = ["facebook", "instagram", "tiktok", "sitio_web"] as const;

export function esTipoImagenIdentidad(valor: unknown): valor is TipoImagenIdentidad {
  return TIPOS_IMAGEN_IDENTIDAD.includes(valor as TipoImagenIdentidad);
}

function normalizarUrl(valor: unknown) {
  if (valor === undefined || valor === null || valor === "") return "";
  if (typeof valor !== "string" || valor.length > 300) return undefined;
  try {
    const url = new URL(valor.trim());
    if (url.protocol !== "https:") return undefined;
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

/* El enlace del mapa se valida como los de redes sociales: HTTPS y con techo de
   largo. No se exige que sea de Google: hay negocios que comparten su punto
   desde otro mapa, y rechazarlo obligaría a explicar por qué su enlace «no
   sirve» cuando sí lleva a su puerta. */
export function normalizarUbicacion(valor: unknown) {
  const url = normalizarUrl(valor);
  if (url === undefined) {
    return {
      correcto: false as const,
      error: "Pega un enlace HTTPS válido de hasta 300 caracteres.",
    };
  }
  return { correcto: true as const, ubicacion: url };
}

/* Un enlace pegado y no un identificador de lugar, por el mismo motivo que la
   ubicación: buscar el lugar por API cuesta y adivinarlo sale mal. El enlace que
   el propio dueño abrió y verificó es el dato más confiable que hay. */
export function normalizarResenas(valor: unknown) {
  const url = normalizarUrl(valor);
  if (url === undefined) {
    return {
      correcto: false as const,
      error: "Pega el enlace HTTPS de tu ficha en Google, de hasta 300 caracteres.",
    };
  }
  return { correcto: true as const, resenas: url };
}

export function normalizarRedesSociales(valor: unknown) {
  const entrada =
    typeof valor === "object" && valor !== null && !Array.isArray(valor)
      ? (valor as Record<string, unknown>)
      : {};
  const redes: RedesSocialesNegocio = {};
  const errores: Record<string, string> = {};

  for (const campo of CAMPOS_REDES) {
    const url = normalizarUrl(entrada[campo]);
    if (url === undefined) {
      errores[campo] = "Escribe un enlace HTTPS válido de hasta 300 caracteres.";
    } else if (url) {
      redes[campo] = url;
    }
  }

  return Object.keys(errores).length
    ? { correcto: false as const, errores }
    : { correcto: true as const, redes };
}

export function obtenerRedesSociales(valor: unknown): RedesSocialesNegocio {
  const resultado = normalizarRedesSociales(valor);
  return resultado.correcto ? resultado.redes : {};
}

export function rutaPerteneceAImagenNegocio(
  ruta: string,
  negocioId: string,
  tipo: TipoImagenIdentidad,
) {
  return ruta.startsWith(`${negocioId}/${tipo}/`) && !ruta.includes("..") && !ruta.includes("\\");
}
