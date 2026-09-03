export const TIPOS_IMAGEN_IDENTIDAD = ["logo", "portada", "qr"] as const;
export type TipoImagenIdentidad = (typeof TIPOS_IMAGEN_IDENTIDAD)[number];

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
