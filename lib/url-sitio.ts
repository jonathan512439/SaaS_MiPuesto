const URL_LOCAL = "http://localhost:3000";

export function obtenerUrlBaseSitio(valor = process.env.NEXT_PUBLIC_SITE_URL) {
  try {
    const url = new URL(valor || URL_LOCAL);
    if (url.protocol !== "http:" && url.protocol !== "https:") return URL_LOCAL;
    return url.origin;
  } catch {
    return URL_LOCAL;
  }
}

export function construirUrlPublicaNegocio(slug: string, base?: string) {
  return new URL(`/${encodeURIComponent(slug)}`, obtenerUrlBaseSitio(base)).toString();
}

