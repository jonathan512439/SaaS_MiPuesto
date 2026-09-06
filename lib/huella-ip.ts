/* La IP no se guarda nunca: se guarda su firma. Sirve igual para contar cuántas
   veces vino el mismo visitante, y deja de ser un dato personal que custodiar.

   Vive acá y no dentro de una ruta porque ahora la usan dos —los pedidos y la
   analítica— y dos copias de un cálculo criptográfico terminan divergiendo. */
export function obtenerIpSolicitud(solicitud: Request): string {
  const ipCloudflare = solicitud.headers.get("cf-connecting-ip")?.trim();
  if (ipCloudflare) return ipCloudflare.slice(0, 64);
  const primeraIp = solicitud.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (primeraIp || "entorno-local").slice(0, 64);
}

export async function crearHuellaIp(ip: string, secreto: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(firma), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function leerSecretoHuella(): string {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}
